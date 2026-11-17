"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyUser, type NotificationType } from "@/lib/notifications";
import { parseSubmissionForm } from "@/lib/campaigns";
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { validatePostUrl } from "@/lib/verification";

export type SubmitClipState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

export type SubmitAppealState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
      success?: boolean;
    }
  | undefined;

const SETUP_MESSAGE =
  "Submitting clips needs a configured backend. Add your Supabase credentials and run the migrations in supabase/migrations.";

interface MembershipRow {
  id: string;
  status: string;
}

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  submission_deadline: string | null;
  max_submissions_per_creator: number | null;
  brand_id: string;
}

interface RulesRow {
  platforms: string[] | null;
}

interface SubmissionRow {
  id: string;
  status: string;
  creator_id: string;
}

function adminConfigured(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/** Best-effort notification to platform staff; never blocks the creator flow. */
async function notifyAdmins(payload: {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!adminConfigured()) return;
  try {
    const admin = await createAdminClient();
    const { data } = (await admin
      .from("profiles")
      .select("id")
      .in("role", ["admin", "super_admin", "moderation"])) as {
      data: { id: string }[] | null;
    };
    await Promise.all(
      (data ?? []).map((row) => notifyUser({ ...payload, userId: row.id }))
    );
  } catch {
    // Best-effort only.
  }
}

/**
 * Submit a published clip URL to a campaign the creator has joined.
 *
 * The URL is only recorded — it is NEVER treated as proof of views. Eligibility
 * and payout are always derived later from API-verified metrics.
 */
export async function submitClip(
  _state: SubmitClipState,
  formData: FormData
): Promise<SubmitClipState> {
  if (!isSupabaseConfigured()) {
    return { message: SETUP_MESSAGE };
  }

  const user = await requireRole("clipper");

  const parsed = parseSubmissionForm(formData);
  if (!parsed.ok || !parsed.data) {
    return { errors: parsed.errors };
  }
  const { campaignId, platform, postUrl, caption } = parsed.data;

  const validation = validatePostUrl(platform, postUrl);
  if (!validation.ok) {
    return {
      errors: {
        postUrl: [validation.error ?? "Enter a valid post URL for this platform."],
      },
    };
  }

  const supabase = await createClient();

  const { data: membership } = (await supabase
    .from("campaign_memberships")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("creator_id", user.id)
    .maybeSingle()) as { data: MembershipRow | null };

  if (!membership || membership.status !== "joined") {
    return { message: "Join this campaign before submitting a clip." };
  }

  const { data: campaign } = (await supabase
    .from("campaigns")
    .select(
      "id, title, status, submission_deadline, max_submissions_per_creator, brand_id"
    )
    .eq("id", campaignId)
    .maybeSingle()) as { data: CampaignRow | null };

  if (!campaign) {
    return { message: "This campaign is no longer available." };
  }
  if (campaign.status !== "active" && campaign.status !== "scheduled") {
    return { message: "This campaign is not accepting submissions." };
  }
  if (
    campaign.submission_deadline &&
    new Date(campaign.submission_deadline).getTime() < Date.now()
  ) {
    return { message: "The submission deadline for this campaign has passed." };
  }

  const { data: rules } = (await supabase
    .from("campaign_rules")
    .select("platforms")
    .eq("campaign_id", campaignId)
    .maybeSingle()) as { data: RulesRow | null };

  const allowedPlatforms = rules?.platforms ?? [];
  if (allowedPlatforms.length > 0 && !allowedPlatforms.includes(platform)) {
    return {
      errors: {
        platform: ["This campaign does not accept submissions on that platform."],
      },
    };
  }

  if (campaign.max_submissions_per_creator != null) {
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("creator_id", user.id);

    if ((count ?? 0) >= campaign.max_submissions_per_creator) {
      return {
        message: `You can submit at most ${campaign.max_submissions_per_creator} clip(s) to this campaign.`,
      };
    }
  }

  const { data: inserted, error } = (await supabase
    .from("submissions")
    .insert({
      campaign_id: campaignId,
      creator_id: user.id,
      membership_id: membership.id,
      platform,
      post_url: validation.normalizedUrl ?? postUrl,
      external_post_id: validation.externalId ?? null,
      caption: caption || null,
      status: "submitted",
    })
    .select("id")
    .single()) as { data: { id: string } | null; error: { code?: string } | null };

  if (error) {
    if (error.code === "23505") {
      return {
        errors: {
          postUrl: ["This post has already been submitted to this campaign."],
        },
      };
    }
    return { message: "We couldn't submit your clip. Please try again." };
  }

  if (!inserted) {
    return { message: "We couldn't submit your clip. Please try again." };
  }

  await notifyUser({
    userId: campaign.brand_id,
    type: "submission",
    title: "New clip submitted",
    body: `A creator submitted a clip to "${campaign.title}".`,
    link: `/dashboard/submissions/${inserted.id}`,
    metadata: { campaign_id: campaignId, submission_id: inserted.id },
  });

  await logAudit({
    actorId: user.id,
    actorRole: "clipper",
    action: "submission.create",
    entityType: "submission",
    entityId: inserted.id,
    metadata: { campaign_id: campaignId, platform },
  });

  revalidatePath("/dashboard/submissions");
  revalidatePath(`/dashboard/workspace/${campaignId}`);
  revalidatePath(`/dashboard/submissions/${inserted.id}`);

  redirect(`/dashboard/submissions/${inserted.id}`);
}

/**
 * File an appeal against the creator's own rejected submission. One open appeal
 * per submission.
 */
export async function submitAppeal(
  _state: SubmitAppealState,
  formData: FormData
): Promise<SubmitAppealState> {
  if (!isSupabaseConfigured()) {
    return { message: SETUP_MESSAGE };
  }

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!submissionId) {
    return { message: "Missing submission reference." };
  }
  if (reason.length < 10) {
    return {
      errors: {
        reason: ["Please describe why this decision should be reviewed (at least 10 characters)."],
      },
    };
  }
  if (reason.length > 2000) {
    return { errors: { reason: ["Please keep your appeal under 2,000 characters."] } };
  }

  const user = await requireRole("clipper");
  const supabase = await createClient();

  const { data: submission } = (await supabase
    .from("submissions")
    .select("id, status, creator_id")
    .eq("id", submissionId)
    .maybeSingle()) as { data: SubmissionRow | null };

  if (!submission || submission.creator_id !== user.id) {
    return { message: "Submission not found." };
  }
  if (submission.status !== "rejected") {
    return { message: "Only rejected submissions can be appealed." };
  }

  const { data: existingAppeal } = (await supabase
    .from("appeals")
    .select("id")
    .eq("submission_id", submissionId)
    .maybeSingle()) as { data: { id: string } | null };

  if (existingAppeal) {
    return { message: "An appeal has already been filed for this submission." };
  }

  const { error } = await supabase.from("appeals").insert({
    submission_id: submissionId,
    creator_id: user.id,
    reason,
    status: "open",
  });

  if (error) {
    return { message: "We couldn't submit your appeal. Please try again." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: "clipper",
    action: "submission.appeal",
    entityType: "submission",
    entityId: submissionId,
    metadata: { submission_id: submissionId },
  });

  await notifyAdmins({
    type: "support",
    title: "New submission appeal",
    body: "A creator has appealed a rejected submission and needs review.",
    link: `/dashboard/submissions/${submissionId}`,
    metadata: { submission_id: submissionId, creator_id: user.id },
  });

  revalidatePath(`/dashboard/submissions/${submissionId}`);
  revalidatePath("/dashboard/submissions");

  return {
    success: true,
    message: "Your appeal has been submitted. Our team will review it.",
  };
}
