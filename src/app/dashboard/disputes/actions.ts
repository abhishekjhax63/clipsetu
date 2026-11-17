"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type DisputeActionState =
  | {
      success?: boolean;
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

const SETUP_MESSAGE =
  "Disputes need a configured backend. Add your Supabase credentials and run the migrations in supabase/migrations.";

const DISPUTE_TYPES = ["submission", "payment", "campaign", "account"] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Raise a dispute. Inserted through the RLS user client so `raised_by` is always
 * the signed-in user; the owner-select policy later restricts who can read it.
 */
export async function createDispute(
  _state: DisputeActionState,
  formData: FormData
): Promise<DisputeActionState> {
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const user = await requireAuth();

  const type = str(formData, "type");
  const campaignId = str(formData, "campaignId");
  const submissionId = str(formData, "submissionId");
  const subject = str(formData, "subject");
  const description = str(formData, "description");

  const errors: Record<string, string[]> = {};

  if (!(DISPUTE_TYPES as readonly string[]).includes(type)) {
    errors.type = ["Choose a dispute type."];
  }
  if (campaignId && !UUID_RE.test(campaignId)) {
    errors.campaignId = ["Campaign reference must be a valid id."];
  }
  if (submissionId && !UUID_RE.test(submissionId)) {
    errors.submissionId = ["Submission reference must be a valid id."];
  }
  if (subject.length < 3) {
    errors.subject = ["Add a short subject (at least 3 characters)."];
  } else if (subject.length > 160) {
    errors.subject = ["Keep the subject under 160 characters."];
  }
  if (description.length < 10) {
    errors.description = ["Describe the dispute in at least 10 characters."];
  } else if (description.length > 4000) {
    errors.description = ["Please keep your description under 4,000 characters."];
  }

  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();

  const { data: dispute, error } = (await supabase
    .from("disputes")
    .insert({
      raised_by: user.id,
      type,
      campaign_id: campaignId || null,
      submission_id: submissionId || null,
      subject,
      description,
      status: "open",
    })
    .select("id")
    .single()) as { data: { id: string } | null; error: unknown };

  if (error || !dispute) {
    return {
      message:
        "We couldn't file your dispute. Check the campaign or submission reference and try again.",
    };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "dispute.create",
    entityType: "dispute",
    entityId: dispute.id,
    metadata: {
      type,
      campaign_id: campaignId || null,
      submission_id: submissionId || null,
    },
  });

  revalidatePath("/dashboard/disputes");
  revalidatePath(`/dashboard/disputes/${dispute.id}`);
  redirect(`/dashboard/disputes/${dispute.id}`);
}
