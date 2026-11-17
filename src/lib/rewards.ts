/**
 * CLIPSETU reward engine — pure, server-side calculations only.
 *
 * Money is always INR. These functions take plain numbers so they can be unit
 * tested and reused by server actions, admin tools and jobs. NEVER call this
 * from the client to decide a payable amount — the client only displays what the
 * server computed.
 */

export interface RewardInput {
  /** Verified views for the submission (from an approved metrics source). */
  eligibleViews: number;
  /** Campaign reward rate per 1,000 eligible views. */
  rewardPer1000Views: number;
  /** Optional hard cap for a single submission. */
  maxRewardPerSubmission?: number | null;
  /** Minimum verified views before any reward is due. */
  minEligibleViews: number;
  /** Remaining campaign budget, when known. Caps the gross reward. */
  remainingCampaignBudget?: number | null;
  /** Platform fee percentage (0–100) deducted from the gross reward. */
  platformFeePercent: number;
}

export type RewardCap =
  | "none"
  | "min_views"
  | "submission_cap"
  | "campaign_budget";

export interface RewardResult {
  eligible: boolean;
  reason: string | null;
  /** Gross reward before platform fee. */
  gross: number;
  platformFee: number;
  /** Amount credited to the creator (gross − platformFee). */
  net: number;
  cappedBy: RewardCap;
}

/** Rounds to 2 decimals using a half-up style correction for float drift. */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const ZERO: Omit<RewardResult, "reason" | "cappedBy"> = {
  eligible: false,
  gross: 0,
  platformFee: 0,
  net: 0,
};

export function computeReward(input: RewardInput): RewardResult {
  const views = Math.max(0, Math.floor(input.eligibleViews));
  const rate = Math.max(0, input.rewardPer1000Views);
  const minViews = Math.max(0, input.minEligibleViews);
  const feePercent = Math.min(100, Math.max(0, input.platformFeePercent));

  if (views <= 0) {
    return {
      ...ZERO,
      reason: "No verified views recorded yet.",
      cappedBy: "min_views",
    };
  }

  if (views < minViews) {
    return {
      ...ZERO,
      reason: `Requires at least ${minViews.toLocaleString("en-IN")} verified views.`,
      cappedBy: "min_views",
    };
  }

  let gross = (views / 1000) * rate;
  let cappedBy: RewardCap = "none";

  if (
    input.maxRewardPerSubmission != null &&
    gross > input.maxRewardPerSubmission
  ) {
    gross = input.maxRewardPerSubmission;
    cappedBy = "submission_cap";
  }

  if (
    input.remainingCampaignBudget != null &&
    gross > input.remainingCampaignBudget
  ) {
    gross = input.remainingCampaignBudget;
    cappedBy = "campaign_budget";
  }

  gross = roundCurrency(Math.max(0, gross));
  const platformFee = roundCurrency((gross * feePercent) / 100);
  const net = roundCurrency(gross - platformFee);

  return {
    eligible: gross > 0,
    reason: gross > 0 ? null : "Reward resolved to zero.",
    gross,
    platformFee,
    net,
    cappedBy,
  };
}

/** Builds the human-readable formula shown to brands and creators. */
export function rewardFormula(
  rewardPer1000Views: number,
  currency = "INR"
): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(rewardPer1000Views);
  return `${formatted} per 1,000 verified views`;
}
