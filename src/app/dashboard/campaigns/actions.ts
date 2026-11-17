"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { parseCampaignForm, type CampaignFormValues } from "@/lib/campaigns";
import { computeReward } from "@/lib/rewards";
import { creditReward } from "@/lib/ledger";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatINR } from "@/lib/utils";

export type CampaignActionState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

export type ReviewDecision = "approve" | "reject" | "request_revision";

export type ReviewResult = { ok: boolean; message?: string };

const SETUP_MESSAGE =
  "Supabase is not configured. Copy .env.local.example to .env.local, add your project credentials and run the migrations in supabase/migrations.";

const ASSET_TYPES = ["video", "image", "logo", "document", "reference"] as const;

/** Statuses in which a campaign's details may still be edited. */
const EDITABLE_STATUSES = [
  "draft",
  "pending_payment",
  "pending_review",
  "scheduled",
  "active",
  "paused",
];

// ---------------------------------------------------------------------------
// Shared mapping helpers
// ---------------------------------------------------------------------------

/** Publish rule: funded campaigns require payment; unpaid ones go to review. */
function computeInitialStatus(values: CampaignFormValues): string {
  if (values.publish && values.budget > 0) return "pending_payment";
  if (values.publish && values.budget === 0) return "pending_review";
  return "draft";
}

function campaignColumns(values: CampaignFormValues) {
  return {
    title: values.title,
    description: values.description || null,
    category: values.category || null,
    type: values.type,
    objective: values.objective || null,
    budget: values.budget,
    reward_per_1k_views: values.rewardPer1k,
    max_reward_per_submission: values.maxRewardPerSubmission,
    max_campaign_reward: values.maxCampaignReward,
    min_views: values.minViews,
    max_submissions_per_creator: values.maxSubmissionsPerCreator,
    max_total_submissions: values.maxTotalSubmissions,
    thumbnail_url: values.thumbnailUrl || null,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
    submission_deadline: values.submissionDeadline || null,
  };
}

function rulesColumns(values: CampaignFormValues) {
  return {
    platforms: values.platforms,
    required_hashtags: values.requiredHashtags,
    required_mentions: values.requiredMentions,
    caption_requirements: values.captionRequirements || null,
    min_duration_seconds: values.minDurationSeconds,
    max_duration_seconds: values.maxDurationSeconds,
    content_restrictions: values.contentRestrictions || null,
    mandatory_branding: values.mandatoryBranding || null,
    prohibited_content: values.prohibitedContent || null,
    language: values.language || null,
    disclosure_required: values.disclosureRequired,
    eligible_categories: values.eligibleCategories,
    min_followers: values.minFollowers,
    geographic_restrictions: values.geographicRestrictions,
    age_requirement: values.ageRequirement,
  };
}

/** Reads repeated assetType/assetUrl(/assetFilename) inputs and zips them. */
function parseAssets(fd: FormData) {
  const types = fd.getAll("assetType").map((v) => (typeof v === "string" ? v : ""));
  const urls = fd.getAll("assetUrl").map((v) => (typeof v === "string" ? v.trim() : ""));
  const filenames = fd
    .getAll("assetFilename")
    .map((v) => (typeof v === "string" ? v.trim() : ""));

  const rows: { type: string; url: string; filename: string | null }[] = [];
  const length = Math.max(types.length, urls.length);
  for (let i = 0; i < length; i++) {
    const url = urls[i] ?? "";
    if (!url) continue;
    const type = (ASSET_TYPES as readonly string[]).includes(types[i])
      ? types[i]
      : "reference";
    rows.push({ type, url, filename: filenames[i] || null });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export async function createCampaign(
  _state: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const user = await requireRole("brand");

  const parsed = parseCampaignForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const values = parsed.data!;
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      brand_id: user.id,
      status: computeInitialStatus(values),
      remaining_budget: 0,
      funded_amount: 0,
      ...campaignColumns(values),
    })
    .select("id")
    .single();

  if (error || !campaign) {
    return { message: error?.message ?? "Could not create the campaign." };
  }

  const campaignId = campaign.id as string;

  const { error: rulesError } = await supabase
    .from("campaign_rules")
    .insert({ campaign_id: campaignId, ...rulesColumns(values) });

  if (rulesError) {
    // Roll back the campaign so we never leave a half-created record.
    await supabase.from("campaigns").delete().eq("id", campaignId);
    return { message: rulesError.message };
  }

  const assets = parseAssets(formData);
  if (assets.length > 0) {
    await supabase
      .from("campaign_assets")
      .insert(assets.map((a) => ({ campaign_id: campaignId, ...a })));
  }

  await notifyUser({
    userId: user.id,
    type: "campaign",
    title: "Campaign created",
    body: values.title,
    link: `/dashboard/campaigns/${campaignId}`,
  });
  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "campaign.create",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { status: computeInitialStatus(values) },
  });

  revalidatePath("/dashboard/campaigns");
  redirect(`/dashboard/campaigns/${campaignId}`);
}

export async function updateCampaign(
  _state: CampaignActionState,
  formData: FormData
): Promise<CampaignActionState> {
  const user = await requireRole("brand");

  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return { message: "Missing campaign reference." };

  const parsed = parseCampaignForm(formData);
  if (!parsed.ok) return { errors: parsed.errors };

  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const values = parsed.data!;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("campaigns")
    .select(
      "id, brand_id, status, reward_per_1k_views, max_reward_per_submission, max_campaign_reward, min_views"
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (!existing || existing.brand_id !== user.id) {
    return { message: "Campaign not found." };
  }

  if (!EDITABLE_STATUSES.includes(existing.status as string)) {
    return { message: `A ${String(existing.status).replace(/_/g, " ")} campaign can no longer be edited.` };
  }

  // Reward rules are locked once any submission has been approved, so brands
  // cannot retroactively change what creators have already earned against.
  const { count: approvedCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "approved");

  if (
    (approvedCount ?? 0) > 0 &&
    (Number(existing.reward_per_1k_views) !== values.rewardPer1k ||
      Number(existing.max_reward_per_submission ?? 0) !==
        Number(values.maxRewardPerSubmission ?? 0) ||
      Number(existing.max_campaign_reward ?? 0) !==
        Number(values.maxCampaignReward ?? 0) ||
      Number(existing.min_views) !== values.minViews)
  ) {
    return {
      errors: {
        rewardPer1k: [
          "Reward rules are locked because this campaign already has approved submissions.",
        ],
      },
    };
  }

  const { error } = await supabase
    .from("campaigns")
    .update(campaignColumns(values))
    .eq("id", campaignId)
    .eq("brand_id", user.id);

  if (error) return { message: error.message };

  await supabase
    .from("campaign_rules")
    .upsert({ campaign_id: campaignId, ...rulesColumns(values) }, { onConflict: "campaign_id" });

  // Replace assets wholesale — the wizard submits the full set each time.
  await supabase.from("campaign_assets").delete().eq("campaign_id", campaignId);
  const assets = parseAssets(formData);
  if (assets.length > 0) {
    await supabase
      .from("campaign_assets")
      .insert(assets.map((a) => ({ campaign_id: campaignId, ...a })));
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "campaign.update",
    entityType: "campaign",
    entityId: campaignId,
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/campaigns");
  redirect(`/dashboard/campaigns/${campaignId}`);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

async function loadOwnedCampaign(
  campaignId: string,
  userId: string
): Promise<{ id: string; status: string; title: string } | null> {
  if (!campaignId || !isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, brand_id, status, title")
    .eq("id", campaignId)
    .maybeSingle();
  if (!data || data.brand_id !== userId) return null;
  return { id: data.id, status: data.status, title: data.title };
}

async function applyStatus(
  campaignId: string,
  from: string[],
  to: string,
  action: string
): Promise<void> {
  const user = await requireRole("brand");
  const campaign = await loadOwnedCampaign(campaignId, user.id);
  if (!campaign || !from.includes(campaign.status)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: to })
    .eq("id", campaignId)
    .eq("brand_id", user.id);

  if (error) return;

  await notifyUser({
    userId: user.id,
    type: "campaign",
    title: `Campaign ${to.replace(/_/g, " ")}`,
    body: campaign.title,
    link: `/dashboard/campaigns/${campaignId}`,
  });
  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action,
    entityType: "campaign",
    entityId: campaignId,
    metadata: { from: campaign.status, to },
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/campaigns");
}

export async function pauseCampaign(formData: FormData): Promise<void> {
  await applyStatus(String(formData.get("campaignId") ?? ""), ["active"], "paused", "campaign.pause");
}

export async function resumeCampaign(formData: FormData): Promise<void> {
  await applyStatus(String(formData.get("campaignId") ?? ""), ["paused"], "active", "campaign.resume");
}

export async function endCampaign(formData: FormData): Promise<void> {
  await applyStatus(
    String(formData.get("campaignId") ?? ""),
    ["active", "paused"],
    "completed",
    "campaign.end"
  );
}

export async function cancelCampaign(formData: FormData): Promise<void> {
  await applyStatus(
    String(formData.get("campaignId") ?? ""),
    ["draft", "pending_payment", "pending_review", "scheduled", "active", "paused"],
    "cancelled",
    "campaign.cancel"
  );
}

export async function duplicateCampaign(formData: FormData): Promise<void> {
  const user = await requireRole("brand");
  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId || !isSupabaseConfigured()) return;

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (!source || source.brand_id !== user.id) return;

  // Reset funding + status on the copy; nothing carries over financially.
  const dropKeys = new Set(["id", "created_at", "updated_at", "brand_id"]);
  const campaignCopy = Object.fromEntries(
    Object.entries(source as Record<string, unknown>).filter(([k]) => !dropKeys.has(k))
  );

  const { data: copy, error } = await supabase
    .from("campaigns")
    .insert({
      ...campaignCopy,
      brand_id: user.id,
      title: `${String(source.title)} (copy)`,
      status: "draft",
      funded_amount: 0,
      remaining_budget: 0,
    })
    .select("id")
    .single();

  if (error || !copy) return;
  const newId = copy.id as string;

  const { data: rules } = await supabase
    .from("campaign_rules")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (rules) {
    const ruleDrop = new Set(["id", "created_at", "updated_at", "campaign_id"]);
    const ruleCopy = Object.fromEntries(
      Object.entries(rules as Record<string, unknown>).filter(([k]) => !ruleDrop.has(k))
    );
    await supabase.from("campaign_rules").insert({ campaign_id: newId, ...ruleCopy });
  }

  const { data: assets } = await supabase
    .from("campaign_assets")
    .select("type, url, filename, size_bytes")
    .eq("campaign_id", campaignId);

  if (assets && assets.length > 0) {
    await supabase
      .from("campaign_assets")
      .insert(assets.map((a: Record<string, unknown>) => ({ campaign_id: newId, ...a })));
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "campaign.duplicate",
    entityType: "campaign",
    entityId: newId,
    metadata: { sourceId: campaignId },
  });

  revalidatePath("/dashboard/campaigns");
  redirect(`/dashboard/campaigns/${newId}`);
}

// ---------------------------------------------------------------------------
// Submission review
// ---------------------------------------------------------------------------

export async function reviewSubmission(
  submissionId: string,
  decision: ReviewDecision,
  notes?: string
): Promise<ReviewResult> {
  const user = await requireRole("brand");
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, campaign_id, creator_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) return { ok: false, message: "Submission not found." };

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, brand_id, title, reward_per_1k_views, max_reward_per_submission, min_views, remaining_budget")
    .eq("id", submission.campaign_id)
    .maybeSingle();

  if (!campaign || campaign.brand_id !== user.id) {
    return { ok: false, message: "You can only review submissions for your own campaigns." };
  }

  const now = new Date().toISOString();
  const trimmedNotes = notes?.trim() || null;
  const link = `/dashboard/submissions`;

  if (decision === "approve") {
    // NEVER invent metrics: only verified numbers can release a reward.
    const { data: metric } = await supabase
      .from("submission_metrics")
      .select("view_count, metrics_source, verification_status")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!metric || metric.verification_status !== "verified") {
      await supabase
        .from("submissions")
        .update({
          status: "metrics_unavailable",
          review_notes: trimmedNotes,
          reviewer_id: user.id,
          reviewed_at: now,
        })
        .eq("id", submissionId);

      await notifyUser({
        userId: submission.creator_id,
        type: "submission",
        title: "Metrics unavailable",
        body: `We could not verify views for your submission to "${campaign.title}". No reward was credited yet.`,
        link,
      });
      await logAudit({
        actorId: user.id,
        actorRole: user.role,
        action: "submission.metrics_unavailable",
        entityType: "submission",
        entityId: submissionId,
      });

      revalidatePath(`/dashboard/campaigns/${campaign.id}/submissions`);
      return { ok: true, message: "Marked metrics unavailable — no reward was credited." };
    }

    const reward = computeReward({
      eligibleViews: Number(metric.view_count ?? 0),
      rewardPer1000Views: Number(campaign.reward_per_1k_views ?? 0),
      maxRewardPerSubmission: campaign.max_reward_per_submission,
      minEligibleViews: Number(campaign.min_views ?? 0),
      remainingCampaignBudget: Number(campaign.remaining_budget ?? 0),
      platformFeePercent: PLATFORM_FEE_PERCENT,
    });

    await supabase
      .from("submissions")
      .update({
        status: "approved",
        review_notes: trimmedNotes,
        reviewer_id: user.id,
        reviewed_at: now,
      })
      .eq("id", submissionId);

    let credited = false;
    if (reward.eligible && reward.net > 0) {
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
      credited = credit.ok;
    }

    await notifyUser({
      userId: submission.creator_id,
      type: "reward",
      title: credited ? "Submission approved" : "Submission approved",
      body: credited
        ? `You earned ${formatINR(reward.net)} for your clip in "${campaign.title}".`
        : `Your clip for "${campaign.title}" was approved. No reward was due at the current view threshold.`,
      link,
    });
    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "submission.approve",
      entityType: "submission",
      entityId: submissionId,
      metadata: {
        gross: reward.gross,
        platformFee: reward.platformFee,
        net: reward.net,
        credited,
        cappedBy: reward.cappedBy,
      },
    });

    revalidatePath(`/dashboard/campaigns/${campaign.id}/submissions`);
    return {
      ok: true,
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
        rejection_reason: trimmedNotes,
        review_notes: trimmedNotes,
        reviewer_id: user.id,
        reviewed_at: now,
      })
      .eq("id", submissionId);

    await notifyUser({
      userId: submission.creator_id,
      type: "submission",
      title: "Submission rejected",
      body: trimmedNotes ?? `Your submission to "${campaign.title}" was rejected.`,
      link,
    });
    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "submission.reject",
      entityType: "submission",
      entityId: submissionId,
    });

    revalidatePath(`/dashboard/campaigns/${campaign.id}/submissions`);
    return { ok: true, message: "Submission rejected." };
  }

  await supabase
    .from("submissions")
    .update({
      status: "revision_requested",
      review_notes: trimmedNotes,
      reviewer_id: user.id,
      reviewed_at: now,
    })
    .eq("id", submissionId);

  await notifyUser({
    userId: submission.creator_id,
    type: "submission",
    title: "Revision requested",
    body: trimmedNotes ?? `A revision was requested for your submission to "${campaign.title}".`,
    link,
  });
  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "submission.request_revision",
    entityType: "submission",
    entityId: submissionId,
  });

  revalidatePath(`/dashboard/campaigns/${campaign.id}/submissions`);
  return { ok: true, message: "Revision requested." };
}
