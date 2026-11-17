"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import type { SessionUser } from "@/lib/auth";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isLedgerConfigured, setWithdrawalStatus } from "@/lib/ledger";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { formatINR } from "@/lib/utils";

/**
 * Admin payout administration.
 *
 * Wallet effects ONLY happen through `setWithdrawalStatus` (an append-only
 * ledger transition — a failed/rejected payout releases the held funds back to
 * the creator's available balance via the wallet trigger). A payout is never
 * marked completed by automation: `initiatePayout` is honest about the missing
 * provider integration and a manual settlement requires a real reference.
 */
export type AdminPayoutActionState = { ok: boolean; message?: string };

const SETUP_MESSAGE =
  "Payment administration needs a configured backend. Add your Supabase credentials (and the service-role key) and run the migrations in supabase/migrations.";

const NOT_ENABLED_MESSAGE =
  "Payout processing is not enabled. Configure the service-role key so ledger transitions can run.";

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  status: string;
}

function label(status: string): string {
  return status.replace(/_/g, " ");
}

async function loadWithdrawal(
  withdrawalId: string
): Promise<WithdrawalRow | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("withdrawals")
    .select("id, user_id, amount, status")
    .eq("id", withdrawalId)
    .maybeSingle();
  return (data as WithdrawalRow | null) ?? null;
}

interface ChangeInput {
  admin: SessionUser;
  withdrawal: WithdrawalRow;
  from: string[];
  status: "approved" | "processing" | "completed" | "failed" | "rejected";
  action: string;
  message: string;
  notificationTitle: string;
  notificationBody: string;
  payoutRef?: string;
  failureReason?: string;
  approvedBy?: string;
  metadata?: Record<string, unknown>;
}

async function changeStatus(
  input: ChangeInput
): Promise<AdminPayoutActionState> {
  const { admin, withdrawal, from, status } = input;

  if (!from.includes(withdrawal.status)) {
    return {
      ok: false,
      message: `This withdrawal is ${label(
        withdrawal.status
      )} and cannot be moved to ${label(status)} from here.`,
    };
  }

  const result = await setWithdrawalStatus({
    withdrawalId: withdrawal.id,
    status,
    payoutRef: input.payoutRef ?? null,
    failureReason: input.failureReason ?? null,
    approvedBy: input.approvedBy ?? null,
  });

  if (!result.ok) {
    if (result.error === "not_configured") {
      return { ok: false, message: NOT_ENABLED_MESSAGE };
    }
    return {
      ok: false,
      message: "We could not update this withdrawal. Please try again.",
    };
  }

  await logAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: input.action,
    entityType: "withdrawal",
    entityId: withdrawal.id,
    metadata: {
      from: withdrawal.status,
      to: status,
      amount: Number(withdrawal.amount),
      ...(input.metadata ?? {}),
    },
  });

  await notifyUser({
    userId: withdrawal.user_id,
    type: "payout",
    title: input.notificationTitle,
    body: input.notificationBody,
    link: "/dashboard/wallet",
  });

  revalidatePath("/admin/payments");
  return { ok: true, message: input.message };
}

export async function approveWithdrawal(
  _prev: AdminPayoutActionState,
  formData: FormData
): Promise<AdminPayoutActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };
  if (!isLedgerConfigured()) return { ok: false, message: NOT_ENABLED_MESSAGE };

  const admin = await requireAdmin();
  const withdrawalId = String(formData.get("withdrawalId") ?? "").trim();
  if (!withdrawalId) return { ok: false, message: "Missing withdrawal reference." };

  const withdrawal = await loadWithdrawal(withdrawalId);
  if (!withdrawal) return { ok: false, message: "Withdrawal not found." };

  return changeStatus({
    admin,
    withdrawal,
    from: ["pending"],
    status: "approved",
    action: "withdrawal.approve",
    message: "Withdrawal approved.",
    notificationTitle: "Withdrawal approved",
    notificationBody: `Your withdrawal of ${formatINR(
      Number(withdrawal.amount)
    )} was approved and will be processed by the payment team.`,
    approvedBy: admin.id,
  });
}

export async function rejectWithdrawal(
  _prev: AdminPayoutActionState,
  formData: FormData
): Promise<AdminPayoutActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };
  if (!isLedgerConfigured()) return { ok: false, message: NOT_ENABLED_MESSAGE };

  const admin = await requireAdmin();
  const withdrawalId = String(formData.get("withdrawalId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!withdrawalId) return { ok: false, message: "Missing withdrawal reference." };
  if (!reason) {
    return { ok: false, message: "Provide a reason for rejecting this withdrawal." };
  }

  const withdrawal = await loadWithdrawal(withdrawalId);
  if (!withdrawal) return { ok: false, message: "Withdrawal not found." };

  return changeStatus({
    admin,
    withdrawal,
    from: ["pending", "approved", "processing"],
    status: "rejected",
    action: "withdrawal.reject",
    message: "Withdrawal rejected — the held funds were released back to the creator.",
    notificationTitle: "Withdrawal rejected",
    notificationBody: `Your withdrawal of ${formatINR(
      Number(withdrawal.amount)
    )} was rejected. Reason: ${reason}. The funds are back in your available balance.`,
    failureReason: reason,
    metadata: { reason },
  });
}

export async function markPayoutProcessing(
  _prev: AdminPayoutActionState,
  formData: FormData
): Promise<AdminPayoutActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };
  if (!isLedgerConfigured()) return { ok: false, message: NOT_ENABLED_MESSAGE };

  const admin = await requireAdmin();
  const withdrawalId = String(formData.get("withdrawalId") ?? "").trim();
  if (!withdrawalId) return { ok: false, message: "Missing withdrawal reference." };

  const withdrawal = await loadWithdrawal(withdrawalId);
  if (!withdrawal) return { ok: false, message: "Withdrawal not found." };

  return changeStatus({
    admin,
    withdrawal,
    from: ["pending", "approved"],
    status: "processing",
    action: "withdrawal.processing",
    message: "Withdrawal marked as processing.",
    notificationTitle: "Withdrawal processing",
    notificationBody: `Your withdrawal of ${formatINR(
      Number(withdrawal.amount)
    )} is being processed.`,
  });
}

/**
 * HONEST no-op: no automated payout provider is integrated, so we never
 * manufacture a successful payout. A manual settlement must be recorded through
 * `completePayout` with a real provider reference.
 */
export async function initiatePayout(
  _prev: AdminPayoutActionState,
  formData: FormData
): Promise<AdminPayoutActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  await requireAdmin();
  const withdrawalId = String(formData.get("withdrawalId") ?? "").trim();
  if (!withdrawalId) return { ok: false, message: "Missing withdrawal reference." };

  const withdrawal = await loadWithdrawal(withdrawalId);
  if (!withdrawal) return { ok: false, message: "Withdrawal not found." };

  return {
    ok: false,
    message:
      "Automated payouts require an approved payout provider (RazorpayX / Cashfree Payouts). Configure provider credentials and onboarding to initiate payouts.",
  };
}

export async function completePayout(
  _prev: AdminPayoutActionState,
  formData: FormData
): Promise<AdminPayoutActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };
  if (!isLedgerConfigured()) return { ok: false, message: NOT_ENABLED_MESSAGE };

  const admin = await requireAdmin();
  const withdrawalId = String(formData.get("withdrawalId") ?? "").trim();
  const payoutRef = String(formData.get("payoutRef") ?? "").trim();
  if (!withdrawalId) return { ok: false, message: "Missing withdrawal reference." };
  if (!payoutRef) {
    return {
      ok: false,
      message:
        "Enter the provider payout reference before recording the settlement.",
    };
  }

  const withdrawal = await loadWithdrawal(withdrawalId);
  if (!withdrawal) return { ok: false, message: "Withdrawal not found." };

  return changeStatus({
    admin,
    withdrawal,
    from: ["approved", "processing"],
    status: "completed",
    action: "withdrawal.complete",
    message: "Withdrawal completed and the settlement reference recorded.",
    notificationTitle: "Withdrawal paid",
    notificationBody: `Your withdrawal of ${formatINR(
      Number(withdrawal.amount)
    )} was paid. Reference: ${payoutRef}.`,
    payoutRef,
    metadata: { payoutRef },
  });
}

export async function failPayout(
  _prev: AdminPayoutActionState,
  formData: FormData
): Promise<AdminPayoutActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };
  if (!isLedgerConfigured()) return { ok: false, message: NOT_ENABLED_MESSAGE };

  const admin = await requireAdmin();
  const withdrawalId = String(formData.get("withdrawalId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!withdrawalId) return { ok: false, message: "Missing withdrawal reference." };
  if (!reason) {
    return { ok: false, message: "Provide a reason for the failed payout." };
  }

  const withdrawal = await loadWithdrawal(withdrawalId);
  if (!withdrawal) return { ok: false, message: "Withdrawal not found." };

  return changeStatus({
    admin,
    withdrawal,
    from: ["pending", "approved", "processing"],
    status: "failed",
    action: "withdrawal.fail",
    message: "Payout marked failed — the held funds were released back to the creator.",
    notificationTitle: "Payout failed",
    notificationBody: `Your withdrawal of ${formatINR(
      Number(withdrawal.amount)
    )} could not be paid. Reason: ${reason}. The funds are back in your available balance.`,
    failureReason: reason,
    metadata: { reason },
  });
}
