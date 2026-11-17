"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeReward } from "@/lib/rewards";
import { creditReward, isLedgerConfigured } from "@/lib/ledger";
import { refreshSubmissionMetrics } from "@/lib/verification/refresh";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatINR, formatNumber } from "@/lib/utils";

export type ModerationActionState =
  | { success?: boolean; message?: string }
  | undefined;

const SETUP_MESSAGE =
  "Supabase is not configured. Add your project credentials and run the migrations in supabase/migrations.";

const DECISIONS = ["approve", "reject", "revision", "flag"] as const;

const CREATOR_LINK = "/dashboard/submissions";

interface SubmissionRow {
  id: string;
  campaign_id: string;
  creator_id: string;
}

interface CampaignRow {
  id: string;
  title: string;
  reward_per_1k_views: number | null;
  max_reward_per_submission: number | null;
  max_campaign_reward: number | null;
  min_views: number | null;
  remaining_budget: number | null;
}

interface MetricRow {
  view_count: number | null;
  metrics_source: string | null;
  verification_status: string | null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// ---------------------------------------------------------------------------
// Moderation decision
// ---------------------------------------------------------------------------

/**
 * Apply a moderation decision to a submission.
 *
 * Reward rule (mirrors the brand-side `reviewSubmission`): a reward is credited
 * ONLY when the latest `submission_metrics` row for the submission has
 * `verification_status = 'verified'`. When it is not verified the submission is
 * set to `metrics_unavailable` and NOTHING is credited. When the ledger is not
 * configured no approval is recorded at all, so we never mark a submission
 * approved without being able to pay it.
 */
export async function moderateSubmission(
  _state: ModerationActionState,
  formData: FormData
): Promise<ModerationActionState> {
  const staff = await requireStaff();
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const submissionId = str(formData, "submissionId");
  const decision = str(formData, "decision");
  const reason = str(formData, "reason");

  if (!submissionId) return { message: "Missing submission reference." };
  if (!(DECISIONS as readonly string[]).includes(decision)) {
    return { message: "Choose a valid decision." };
  }
  if (decision !== "approve" && !reason) {
    return {
      message:
        "Add a reason before rejecting, requesting a revision or flagging a submission.",
    };
  }

  const supabase = await createAdminClient();

  const { data: submission } = (await supabase
    .from("submissions")
    .select("id, campaign_id, creator_id")
    .eq("id", submissionId)
    .maybeSingle()) as { data: SubmissionRow | null };

  if (!submission) return { message: "Submission not found." };

  const now = new Date().toISOString();

  // Flagging is ADVISORY ONLY. We keep the submission in review, record an audit
  // note, and notify nobody — a human decides, and we never accuse a creator
  // based on unusual performance.
  if (decision === "flag") {
    await logAudit({
      actorId: staff.id,
      actorRole: staff.role,
      action: "fraud_flag",
      entityType: "submission",
      entityId: submissionId,
      metadata: { note: reason },
    });
    return {
      success: true,
      message:
        "Flagged for review. The outcome is unchanged and the creator was not notified.",
    };
  }

  const { data: campaign } = (await supabase
    .from("campaigns")
    .select(
      "id, title, reward_per_1k_views, max_reward_per_submission, max_campaign_reward, min_views, remaining_budget"
    )
    .eq("id", submission.campaign_id)
    .maybeSingle()) as { data: CampaignRow | null };

  if (decision === "approve") {
    // NEVER invent metrics: only verified numbers can release a reward.
    const { data: metric } = (await supabase
      .from("submission_metrics")
      .select("view_count, metrics_source, verification_status")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: MetricRow | null };

    if (!metric || metric.verification_status !== "verified") {
      await supabase
        .from("submissions")
        .update({
          status: "metrics_unavailable",
          review_notes: reason || null,
          reviewer_id: staff.id,
          reviewed_at: now,
        })
        .eq("id", submissionId);

      await notifyUser({
        userId: submission.creator_id,
        type: "submission",
        title: "Metrics unavailable",
        body: `We could not verify views for your submission${
          campaign?.title ? ` to "${campaign.title}"` : ""
        }. No reward was credited.`,
        link: CREATOR_LINK,
      });
      await logAudit({
        actorId: staff.id,
        actorRole: staff.role,
        action: "submission.metrics_unavailable",
        entityType: "submission",
        entityId: submissionId,
      });

      revalidatePath("/admin/moderation");
      revalidatePath("/dashboard/submissions");
      return {
        success: true,
        message:
          "Metrics are not verified — marked 'metrics unavailable'. No reward was credited.",
      };
    }

    if (!campaign) {
      return { message: "Campaign not found for this submission." };
    }

    const reward = computeReward({
      eligibleViews: Number(metric.view_count ?? 0),
      rewardPer1000Views: Number(campaign.reward_per_1k_views ?? 0),
      maxRewardPerSubmission: campaign.max_reward_per_submission,
      minEligibleViews: Number(campaign.min_views ?? 0),
      remainingCampaignBudget: Number(campaign.remaining_budget ?? 0),
      platformFeePercent: PLATFORM_FEE_PERCENT,
    });

    let credited = false;
    if (reward.eligible && reward.net > 0) {
      if (!isLedgerConfigured()) {
        // Honest error: never mark it approved when we cannot actually pay.
        return {
          message:
            "The rewards ledger is not configured, so no reward can be credited. This submission was NOT approved.",
        };
      }
      const credit = await creditReward({
        userId: submission.creator_id,
        campaignId: submission.campaign_id,
        submissionId,
        gross: reward.gross,
        platformFee: reward.platformFee,
        net: reward.net,
        idempotencyKey: `reward:${submissionId}`,
        description: `Reward for ${campaign.title}`,
      });
      if (!credit.ok) {
        return {
          message: `Could not credit the reward (${credit.error}). This submission was NOT approved.`,
        };
      }
      credited = true;
    }

    await supabase
      .from("submissions")
      .update({
        status: "approved",
        review_notes: reason || null,
        reviewer_id: staff.id,
        reviewed_at: now,
      })
      .eq("id", submissionId);

    await notifyUser({
      userId: submission.creator_id,
      type: "reward",
      title: "Submission approved",
      body: credited
        ? `You earned ${formatINR(reward.net)} for your clip in "${campaign.title}".`
        : `Your clip for "${campaign.title}" was approved. No reward was due at the current view threshold.`,
      link: CREATOR_LINK,
    });
    await logAudit({
      actorId: staff.id,
      actorRole: staff.role,
      action: "submission.approve",
      entityType: "submission",
      entityId: submissionId,
      metadata: {
        gross: reward.gross,
        platformFee: reward.platformFee,
        net: reward.net,
        cappedBy: reward.cappedBy,
        credited,
      },
    });

    revalidatePath("/admin/moderation");
    revalidatePath("/dashboard/submissions");
    return {
      success: true,
      message: credited
        ? `Approved and credited ${formatINR(reward.net)} to the creator.`
        : "Approved. No reward was due at the current verified views.",
    };
  }

  if (decision === "reject") {
    await supabase
      .from("submissions")
      .update({
        status: "rejected",
        rejection_reason: reason,
        review_notes: reason,
        reviewer_id: staff.id,
        reviewed_at: now,
      })
      .eq("id", submissionId);

    await notifyUser({
      userId: submission.creator_id,
      type: "submission",
      title: "Submission rejected",
      body: reason,
      link: CREATOR_LINK,
    });
    await logAudit({
      actorId: staff.id,
      actorRole: staff.role,
      action: "submission.reject",
      entityType: "submission",
      entityId: submissionId,
    });

    revalidatePath("/admin/moderation");
    revalidatePath("/dashboard/submissions");
    return { success: true, message: "Submission rejected." };
  }

  // decision === "revision"
  await supabase
    .from("submissions")
    .update({
      status: "revision_requested",
      review_notes: reason,
      reviewer_id: staff.id,
      reviewed_at: now,
    })
    .eq("id", submissionId);

  await notifyUser({
    userId: submission.creator_id,
    type: "submission",
    title: "Revision requested",
    body: reason,
    link: CREATOR_LINK,
  });
  await logAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: "submission.request_revision",
    entityType: "submission",
    entityId: submissionId,
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/dashboard/submissions");
  return { success: true, message: "Revision requested." };
}

// ---------------------------------------------------------------------------
// Metric refresh
// ---------------------------------------------------------------------------

/**
 * Re-runs the official verification adapter for a submission. This NEVER writes
 * fabricated numbers — it returns the adapter's honest result.
 */
export async function refreshMetricsAction(
  _state: ModerationActionState,
  formData: FormData
): Promise<ModerationActionState> {
  await requireStaff();
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const submissionId = str(formData, "submissionId");
  if (!submissionId) return { message: "Missing submission reference." };

  const result = await refreshSubmissionMetrics(submissionId);

  revalidatePath("/admin/moderation");

  if (result.ok) {
    return {
      success: true,
      message: `Refreshed: ${formatNumber(result.views ?? 0)} views (${result.source ?? "source"
        }, ${result.verificationStatus ?? "unknown"}).`,
    };
  }

  if (result.reason === "not_configured") {
    return {
      message:
        "The platform metrics provider is not configured, so no numbers could be fetched.",
    };
  }
  if (result.reason === "rate_limited") {
    return {
      message:
        "The provider rate-limited the request. Metrics stay pending — try again later.",
    };
  }
  if (result.reason === "not_found") {
    return { message: "Submission not found." };
  }
  return {
    message:
      "The provider could not return verified metrics, so nothing was written.",
  };
}
