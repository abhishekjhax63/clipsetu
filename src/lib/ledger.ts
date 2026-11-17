/**
 * Ledger + wallet operations (server-only).
 *
 * Every monetary change goes through an auditable `wallet_transactions` row.
 * Wallet balances are NEVER written directly — they are derived by the
 * `apply_wallet_transaction` trigger from these immutable ledger rows.
 *
 * These functions use the service-role client (they must bypass RLS), so callers
 * are responsible for authorisation checks before invoking them.
 */
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { roundCurrency } from "@/lib/rewards";

export function isLedgerConfigured(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export type LedgerResult =
  | { ok: true; duplicate?: boolean }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export interface RewardCreditInput {
  userId: string;
  campaignId: string;
  submissionId: string;
  /** Gross reward before platform fee. */
  gross: number;
  platformFee: number;
  /** Amount credited to the creator (gross − platformFee). */
  net: number;
  /** Stable key so replays never double-credit, e.g. `reward:<submissionId>`. */
  idempotencyKey: string;
  description?: string;
}

/**
 * Credits a creator reward, records the platform fee, and consumes the campaign
 * budget. Idempotent on `idempotencyKey`.
 */
export async function creditReward(
  input: RewardCreditInput
): Promise<LedgerResult> {
  if (!isLedgerConfigured()) return { ok: false, error: "not_configured" };

  const net = roundCurrency(input.net);
  const gross = roundCurrency(input.gross);
  if (net <= 0 || gross <= 0) return { ok: false, error: "invalid_amount" };

  const supabase = await createAdminClient();

  const { error } = await supabase.from("wallet_transactions").insert({
    user_id: input.userId,
    campaign_id: input.campaignId,
    submission_id: input.submissionId,
    type: "reward",
    direction: "credit",
    amount: net,
    status: "completed",
    idempotency_key: input.idempotencyKey,
    description: input.description ?? "Creator reward",
    metadata: { gross, platform_fee: roundCurrency(input.platformFee) },
  });

  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    return { ok: false, error: error.message };
  }

  if (input.platformFee > 0) {
    await supabase.from("wallet_transactions").insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      submission_id: input.submissionId,
      type: "platform_fee",
      direction: "debit",
      amount: roundCurrency(input.platformFee),
      status: "completed",
      idempotency_key: `${input.idempotencyKey}:fee`,
      description: "Platform fee",
    });
  }

  await consumeCampaignBudget(input.campaignId, gross);

  return { ok: true };
}

/** Atomically reduces a campaign's remaining budget with a compare-and-set. */
async function consumeCampaignBudget(
  campaignId: string,
  amount: number
): Promise<boolean> {
  const supabase = await createAdminClient();

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data } = await supabase
      .from("campaigns")
      .select("remaining_budget")
      .eq("id", campaignId)
      .maybeSingle();

    const current = Number(data?.remaining_budget ?? 0);
    if (current < amount) return false;

    const next = roundCurrency(current - amount);
    const { data: updated, error } = await supabase
      .from("campaigns")
      .update({ remaining_budget: next })
      .eq("id", campaignId)
      .eq("remaining_budget", current)
      .select("id")
      .maybeSingle();

    if (!error && updated) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Brand funding (deposit)
// ---------------------------------------------------------------------------

export interface FundCampaignInput {
  brandUserId: string;
  campaignId: string;
  inrAmount: number;
  /** Provider payment id — used as the idempotency key. */
  paymentRef: string;
}

/** Records a verified brand deposit and credits the campaign budget. */
export async function fundCampaignFromDeposit(
  input: FundCampaignInput
): Promise<LedgerResult> {
  if (!isLedgerConfigured()) return { ok: false, error: "not_configured" };

  const amount = roundCurrency(input.inrAmount);
  if (amount <= 0) return { ok: false, error: "invalid_amount" };

  const supabase = await createAdminClient();
  const idempotencyKey = `deposit:${input.paymentRef}`;

  const { error } = await supabase.from("wallet_transactions").insert({
    user_id: input.brandUserId,
    campaign_id: input.campaignId,
    type: "deposit",
    direction: "credit",
    amount,
    status: "completed",
    idempotency_key: idempotencyKey,
    related_payment_ref: input.paymentRef,
    description: "Campaign funding",
  });

  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }

  const duplicate = error?.code === "23505";

  if (!duplicate) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("funded_amount, remaining_budget, status")
      .eq("id", input.campaignId)
      .maybeSingle();

    if (campaign) {
      const funded = roundCurrency(Number(campaign.funded_amount ?? 0) + amount);
      const remaining = roundCurrency(
        Number(campaign.remaining_budget ?? 0) + amount
      );
      const nextStatus =
        campaign.status === "pending_payment" || campaign.status === "draft"
          ? "pending_review"
          : campaign.status;

      await supabase
        .from("campaigns")
        .update({
          funded_amount: funded,
          remaining_budget: remaining,
          status: nextStatus,
        })
        .eq("id", input.campaignId);
    }
  }

  return { ok: true, duplicate };
}

// ---------------------------------------------------------------------------
// Withdrawals (creator payouts)
// ---------------------------------------------------------------------------

export interface WithdrawalRequestInput {
  userId: string;
  amount: number;
  bankAccountId?: string | null;
}

/**
 * Creates a withdrawal request and holds the funds via a pending debit ledger
 * row (the wallet trigger moves the amount out of `available`).
 */
export async function requestWithdrawal(
  input: WithdrawalRequestInput
): Promise<LedgerResult & { withdrawalId?: string }> {
  if (!isLedgerConfigured()) return { ok: false, error: "not_configured" };

  const amount = roundCurrency(input.amount);
  if (amount <= 0) return { ok: false, error: "invalid_amount" };

  const supabase = await createAdminClient();

  // Check available balance.
  const { data: wallet } = await supabase
    .from("wallets")
    .select("available")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (Number(wallet?.available ?? 0) < amount) {
    return { ok: false, error: "insufficient_balance" };
  }

  const { data: withdrawal, error: insertError } = await supabase
    .from("withdrawals")
    .insert({
      user_id: input.userId,
      amount,
      status: "pending",
      bank_account_id: input.bankAccountId ?? null,
    })
    .select("id")
    .single();

  if (insertError || !withdrawal) {
    return { ok: false, error: insertError?.message ?? "insert_failed" };
  }

  const { error: ledgerError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: input.userId,
      type: "withdrawal",
      direction: "debit",
      amount,
      status: "pending",
      idempotency_key: `withdrawal:${withdrawal.id}`,
      description: "Withdrawal request",
    });

  if (ledgerError) {
    return { ok: false, error: ledgerError.message };
  }

  return { ok: true, withdrawalId: withdrawal.id };
}

/**
 * Moves a withdrawal through its lifecycle. Status must be one of
 * pending|approved|processing|completed|failed|rejected. A `failed`/`rejected`
 * transition on the ledger row releases the held funds back to `available`.
 */
export async function setWithdrawalStatus(input: {
  withdrawalId: string;
  status: "pending" | "approved" | "processing" | "completed" | "failed" | "rejected";
  payoutRef?: string | null;
  failureReason?: string | null;
  approvedBy?: string | null;
}): Promise<LedgerResult> {
  if (!isLedgerConfigured()) return { ok: false, error: "not_configured" };

  const supabase = await createAdminClient();

  const { error: withdrawalError } = await supabase
    .from("withdrawals")
    .update({
      status: input.status,
      payout_ref: input.payoutRef ?? undefined,
      failure_reason: input.failureReason ?? undefined,
      approved_by: input.approvedBy ?? undefined,
      approved_at:
        input.status === "approved" ? new Date().toISOString() : undefined,
    })
    .eq("id", input.withdrawalId);

  if (withdrawalError) return { ok: false, error: withdrawalError.message };

  // Mirror the status onto the ledger row. A failure/rejection releases the
  // hold; the wallet trigger recomputes balances from the state change.
  const ledgerStatus =
    input.status === "failed" || input.status === "rejected"
      ? "failed"
      : input.status;

  const { error: ledgerError } = await supabase
    .from("wallet_transactions")
    .update({ status: ledgerStatus })
    .eq("idempotency_key", `withdrawal:${input.withdrawalId}`);

  if (ledgerError) return { ok: false, error: ledgerError.message };

  return { ok: true };
}
