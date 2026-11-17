"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

/**
 * Admin campaign moderation.
 *
 * Every action re-checks staff authorization, validates the campaign's CURRENT
 * status, applies the transition with an optimistic guard, writes the audit
 * trail and notifies the owning brand. Illegal transitions are rejected with an
 * honest message (no silent state changes). Nothing here touches money — the
 * ledger is only ever changed through the wallet helpers.
 */
export type AdminCampaignActionState = { ok: boolean; message?: string };

const SETUP_MESSAGE =
  "The admin console needs a configured backend. Add your Supabase credentials (and the service-role key) and run the migrations in supabase/migrations.";

/** Statuses a campaign may be approved / rejected from. */
const REVIEWABLE = ["pending_review"];
/** Statuses a live campaign may be paused from. */
const PAUSABLE = ["active", "scheduled"];
/** Status a campaign may be resumed from. */
const RESUMABLE = ["paused"];
/** Statuses a campaign may still be cancelled from. */
const CANCELLABLE = [
  "draft",
  "pending_payment",
  "pending_review",
  "scheduled",
  "active",
  "paused",
];

interface CampaignRow {
  id: string;
  brand_id: string;
  title: string;
  status: string;
  funded_amount: number;
  start_date: string | null;
}

function label(status: string): string {
  return status.replace(/_/g, " ");
}

async function loadCampaign(campaignId: string): Promise<CampaignRow | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, brand_id, title, status, funded_amount, start_date")
    .eq("id", campaignId)
    .maybeSingle();
  return (data as CampaignRow | null) ?? null;
}

/** A future start_date schedules the campaign; otherwise it goes live now. */
function scheduledOrActive(startDate: string | null): "scheduled" | "active" {
  if (startDate && new Date(startDate).getTime() > Date.now()) return "scheduled";
  return "active";
}

interface ApplyInput {
  actor: { id: string; role: string };
  campaign: CampaignRow;
  from: string[];
  to: "scheduled" | "active" | "paused" | "rejected" | "cancelled";
  action: string;
  message: string;
  notificationTitle: string;
  notificationBody: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

async function applyCampaignStatus(
  input: ApplyInput
): Promise<AdminCampaignActionState> {
  const { actor, campaign, from, to } = input;

  if (!from.includes(campaign.status)) {
    return {
      ok: false,
      message: `This campaign is ${label(campaign.status)} and cannot be moved to ${label(to)} from here.`,
    };
  }

  const update: Record<string, unknown> = { status: to };
  if (input.rejectionReason !== undefined) {
    update.rejection_reason = input.rejectionReason;
  }

  const supabase = await createAdminClient();
  const { data: updated, error } = await supabase
    .from("campaigns")
    .update(update)
    .eq("id", campaign.id)
    .eq("status", campaign.status)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!updated || updated.length === 0) {
    return {
      ok: false,
      message:
        "This campaign changed while you were working. Refresh the page and try again.",
    };
  }

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: input.action,
    entityType: "campaign",
    entityId: campaign.id,
    metadata: { from: campaign.status, to, ...(input.metadata ?? {}) },
  });

  await notifyUser({
    userId: campaign.brand_id,
    type: "campaign",
    title: input.notificationTitle,
    body: input.notificationBody,
    link: `/dashboard/campaigns/${campaign.id}`,
  });

  revalidatePath("/admin/campaigns");
  return { ok: true, message: input.message };
}

export async function approveCampaign(
  _prev: AdminCampaignActionState,
  formData: FormData
): Promise<AdminCampaignActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const user = await requireStaff();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Missing campaign reference." };

  const campaign = await loadCampaign(campaignId);
  if (!campaign) return { ok: false, message: "Campaign not found." };

  if (!REVIEWABLE.includes(campaign.status)) {
    return {
      ok: false,
      message: `Only campaigns awaiting review can be approved. This campaign is ${label(campaign.status)}.`,
    };
  }

  if (Number(campaign.funded_amount) <= 0) {
    return { ok: false, message: "Fund the campaign before it can go live." };
  }

  const next = scheduledOrActive(campaign.start_date);

  return applyCampaignStatus({
    actor: user,
    campaign,
    from: REVIEWABLE,
    to: next,
    action: "campaign.approve",
    message:
      next === "scheduled"
        ? "Approved — the campaign is scheduled to start on its start date."
        : "Approved — the campaign is now live.",
    notificationTitle: "Campaign approved",
    notificationBody:
      next === "scheduled"
        ? `"${campaign.title}" was approved and is scheduled to go live.`
        : `"${campaign.title}" was approved and is now live.`,
    metadata: { funded_amount: Number(campaign.funded_amount) },
  });
}

export async function rejectCampaign(
  _prev: AdminCampaignActionState,
  formData: FormData
): Promise<AdminCampaignActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const user = await requireStaff();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Missing campaign reference." };
  if (!reason) {
    return { ok: false, message: "Provide a reason for rejecting the campaign." };
  }

  const campaign = await loadCampaign(campaignId);
  if (!campaign) return { ok: false, message: "Campaign not found." };

  if (!REVIEWABLE.includes(campaign.status)) {
    return {
      ok: false,
      message: `Only campaigns awaiting review can be rejected. This campaign is ${label(campaign.status)}.`,
    };
  }

  return applyCampaignStatus({
    actor: user,
    campaign,
    from: REVIEWABLE,
    to: "rejected",
    action: "campaign.reject",
    message: "Campaign rejected and the brand was notified.",
    notificationTitle: "Campaign rejected",
    notificationBody: `"${campaign.title}" was rejected. Reason: ${reason}`,
    rejectionReason: reason,
    metadata: { reason },
  });
}

export async function pauseCampaign(
  _prev: AdminCampaignActionState,
  formData: FormData
): Promise<AdminCampaignActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const user = await requireStaff();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Missing campaign reference." };

  const campaign = await loadCampaign(campaignId);
  if (!campaign) return { ok: false, message: "Campaign not found." };

  if (!PAUSABLE.includes(campaign.status)) {
    return {
      ok: false,
      message: `Only active or scheduled campaigns can be paused. This campaign is ${label(campaign.status)}.`,
    };
  }

  return applyCampaignStatus({
    actor: user,
    campaign,
    from: PAUSABLE,
    to: "paused",
    action: "campaign.pause",
    message: "Campaign paused.",
    notificationTitle: "Campaign paused",
    notificationBody: `"${campaign.title}" was paused by the ClipSetu team.`,
  });
}

export async function resumeCampaign(
  _prev: AdminCampaignActionState,
  formData: FormData
): Promise<AdminCampaignActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const user = await requireStaff();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Missing campaign reference." };

  const campaign = await loadCampaign(campaignId);
  if (!campaign) return { ok: false, message: "Campaign not found." };

  if (!RESUMABLE.includes(campaign.status)) {
    return {
      ok: false,
      message: `Only paused campaigns can be resumed. This campaign is ${label(campaign.status)}.`,
    };
  }

  const next = scheduledOrActive(campaign.start_date);

  return applyCampaignStatus({
    actor: user,
    campaign,
    from: RESUMABLE,
    to: next,
    action: "campaign.resume",
    message:
      next === "scheduled"
        ? "Campaign resumed and scheduled for its start date."
        : "Campaign resumed and live again.",
    notificationTitle: "Campaign resumed",
    notificationBody:
      next === "scheduled"
        ? `"${campaign.title}" was resumed and is scheduled to start on its start date.`
        : `"${campaign.title}" was resumed and is live again.`,
  });
}

export async function cancelCampaign(
  _prev: AdminCampaignActionState,
  formData: FormData
): Promise<AdminCampaignActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const user = await requireStaff();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!campaignId) return { ok: false, message: "Missing campaign reference." };
  if (!reason) {
    return { ok: false, message: "Provide a reason for cancelling the campaign." };
  }

  const campaign = await loadCampaign(campaignId);
  if (!campaign) return { ok: false, message: "Campaign not found." };

  if (!CANCELLABLE.includes(campaign.status)) {
    return {
      ok: false,
      message: `A ${label(campaign.status)} campaign can no longer be cancelled.`,
    };
  }

  return applyCampaignStatus({
    actor: user,
    campaign,
    from: CANCELLABLE,
    to: "cancelled",
    action: "campaign.cancel",
    message: "Campaign cancelled and the brand was notified.",
    notificationTitle: "Campaign cancelled",
    notificationBody: `"${campaign.title}" was cancelled by the ClipSetu team. Reason: ${reason}`,
    rejectionReason: reason,
    metadata: { reason },
  });
}
