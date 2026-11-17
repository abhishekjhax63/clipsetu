"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isLedgerConfigured, requestWithdrawal } from "@/lib/ledger";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { MIN_WITHDRAWAL_INR } from "@/lib/constants";
import { formatINR } from "@/lib/utils";

export type PayoutState = { ok: boolean; message?: string };

const SETUP_MESSAGE =
  "Payouts need a configured backend. Add your Supabase credentials (and the service-role key) and run the migrations in supabase/migrations.";

const NOT_ENABLED_MESSAGE = "Online payouts are not enabled yet.";

/** True only when the given ISO date is a valid date at least 18 years ago. */
function isAdult(iso: string): boolean {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

interface CreatorProfileRow {
  kyc_status: string;
  date_of_birth: string | null;
}

/**
 * Requests a creator payout. Every eligibility rule (role, KYC, adult, balance)
 * is enforced server-side; the client is never trusted. The funds are held via
 * the ledger (never written to `wallets` directly).
 */
export async function requestPayout(
  _prev: PayoutState,
  formData: FormData
): Promise<PayoutState> {
  const user = await requireAuth();

  if (user.role !== "clipper") {
    return { ok: false, message: "Only creator accounts can request payouts." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: SETUP_MESSAGE };
  }
  if (!isLedgerConfigured()) {
    return { ok: false, message: NOT_ENABLED_MESSAGE };
  }

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter a valid amount." };
  }
  if (amount < MIN_WITHDRAWAL_INR) {
    return {
      ok: false,
      message: `The minimum withdrawal is ${formatINR(MIN_WITHDRAWAL_INR)}.`,
    };
  }

  const bankAccountIdRaw = formData.get("bankAccountId");
  const bankAccountId =
    typeof bankAccountIdRaw === "string" && bankAccountIdRaw.trim()
      ? bankAccountIdRaw.trim()
      : null;

  const supabase = await createClient();

  const [profileRes, walletRes] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select("kyc_status, date_of_birth")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("wallets")
      .select("available")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const profile = profileRes.data as CreatorProfileRow | null;
  const available = Number(walletRes.data?.available ?? 0);

  if (!profile || profile.kyc_status !== "verified") {
    return { ok: false, message: "Complete KYC verification to withdraw." };
  }
  if (!profile.date_of_birth || !isAdult(profile.date_of_birth)) {
    return {
      ok: false,
      message: "Payouts are only available to verified adults.",
    };
  }
  if (available < amount) {
    return {
      ok: false,
      message: `Your available balance is ${formatINR(available)} — not enough for this withdrawal.`,
    };
  }

  if (bankAccountId) {
    const { data: bank } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("id", bankAccountId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!bank) {
      return { ok: false, message: "Select a valid bank account." };
    }
  }

  const result = await requestWithdrawal({
    userId: user.id,
    amount,
    bankAccountId,
  });

  if (!result.ok) {
    if (result.error === "not_configured") {
      return { ok: false, message: NOT_ENABLED_MESSAGE };
    }
    if (result.error === "insufficient_balance") {
      return {
        ok: false,
        message: "Your available balance is too low for this withdrawal.",
      };
    }
    if (result.error === "invalid_amount") {
      return { ok: false, message: "Enter a valid amount." };
    }
    return {
      ok: false,
      message: "We couldn't create your payout request. Please try again.",
    };
  }

  await logAudit({
    actorId: user.id,
    actorRole: "clipper",
    action: "payout.request",
    entityType: "withdrawal",
    entityId: result.withdrawalId ?? null,
    metadata: { amount },
  });

  await notifyUser({
    userId: user.id,
    type: "payout",
    title: "Payout requested",
    body: `Your withdrawal request for ${formatINR(amount)} is pending review. Funds will be released once approved and processed by the payment provider.`,
    link: "/dashboard/wallet",
  });

  revalidatePath("/dashboard/wallet");

  return {
    ok: true,
    message:
      "Payout request submitted. It will be reviewed, then processed by the payment provider.",
  };
}
