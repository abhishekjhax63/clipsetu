"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export interface JoinCampaignResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const SETUP_MESSAGE =
  "Joining campaigns needs a configured backend. Add your Supabase credentials and run the migrations in supabase/migrations.";

interface CreatorProfileRow {
  id: string;
  categories: string[] | null;
  date_of_birth: string | null;
}

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  submission_deadline: string | null;
  max_total_submissions: number | null;
  brand_id: string;
}

interface RulesRow {
  eligible_categories: string[] | null;
}

interface MembershipRow {
  id: string;
  status: string;
}

/** True only when the given ISO date is a valid date at least 18 years ago. */
function isAdult(iso: string): boolean {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return true;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

function adminConfigured(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/**
 * Join an open campaign as the signed-in creator.
 *
 * Every business rule is enforced here, server-side — never trusted from the
 * client. Imported by the public campaign detail page as well as discovery.
 */
export async function joinCampaign(
  campaignId: string
): Promise<JoinCampaignResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: SETUP_MESSAGE };
  }
  if (!campaignId) {
    return { ok: false, error: "Campaign not found." };
  }

  const user = await requireRole("clipper");
  const supabase = await createClient();

  const { data: profile } = (await supabase
    .from("creator_profiles")
    .select("id, categories, date_of_birth")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: CreatorProfileRow | null };

  if (!profile) {
    return {
      ok: false,
      error: "Complete your creator profile before joining campaigns.",
    };
  }

  const { data: campaign } = (await supabase
    .from("campaigns")
    .select(
      "id, title, status, submission_deadline, max_total_submissions, brand_id"
    )
    .eq("id", campaignId)
    .maybeSingle()) as { data: CampaignRow | null };

  if (!campaign) {
    return { ok: false, error: "This campaign is not available." };
  }
  if (campaign.status !== "active" && campaign.status !== "scheduled") {
    return { ok: false, error: "This campaign is not open for joining." };
  }
  if (
    campaign.submission_deadline &&
    new Date(campaign.submission_deadline).getTime() < Date.now()
  ) {
    return {
      ok: false,
      error: "The submission deadline for this campaign has passed.",
    };
  }
  if (profile.date_of_birth && !isAdult(profile.date_of_birth)) {
    return {
      ok: false,
      error: "You must be 18 or older to join paid campaigns.",
    };
  }

  const { data: rules } = (await supabase
    .from("campaign_rules")
    .select("eligible_categories")
    .eq("campaign_id", campaignId)
    .maybeSingle()) as { data: RulesRow | null };

  const eligible = rules?.eligible_categories ?? [];
  if (eligible.length > 0) {
    const mine = profile.categories ?? [];
    if (!eligible.some((category) => mine.includes(category))) {
      return {
        ok: false,
        error: "This campaign is limited to specific creator categories.",
      };
    }
  }

  const { data: existing } = (await supabase
    .from("campaign_memberships")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("creator_id", user.id)
    .maybeSingle()) as { data: MembershipRow | null };

  if (existing?.status === "joined") {
    return { ok: true, message: "You have already joined this campaign." };
  }
  if (existing) {
    return { ok: false, error: "You can't rejoin this campaign." };
  }

  if (campaign.max_total_submissions != null) {
    // A creator can only see their own membership rows under RLS, so the total
    // count requires the service-role client. When unavailable, the database's
    // unique constraint still protects against duplicate joins.
    let joinedCount = 0;
    if (adminConfigured()) {
      const admin = await createAdminClient();
      const { count } = await admin
        .from("campaign_memberships")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "joined");
      joinedCount = count ?? 0;
    }
    if (joinedCount >= campaign.max_total_submissions) {
      return {
        ok: false,
        error: "This campaign has reached its creator limit.",
      };
    }
  }

  const { error } = await supabase.from("campaign_memberships").insert({
    campaign_id: campaignId,
    creator_id: user.id,
    status: "joined",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, message: "You have already joined this campaign." };
    }
    return {
      ok: false,
      error: "We couldn't join you to this campaign. Please try again.",
    };
  }

  // Best-effort brand notification — never blocks the join.
  await notifyUser({
    userId: campaign.brand_id,
    type: "campaign",
    title: "A creator joined your campaign",
    body: `${user.fullName ?? "A creator"} joined "${campaign.title}".`,
    link: `/dashboard/workspace/${campaignId}`,
    metadata: { campaign_id: campaignId, creator_id: user.id },
  });

  await logAudit({
    actorId: user.id,
    actorRole: "clipper",
    action: "campaign.join",
    entityType: "campaign",
    entityId: campaignId,
    metadata: { campaign_id: campaignId },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard/discover");

  return { ok: true, message: "Joined! Open your workspace to get started." };
}
