"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

export type DisputeActionState =
  | { success?: boolean; message?: string }
  | undefined;

const SETUP_MESSAGE =
  "Supabase is not configured. Add your project credentials and run the migrations in supabase/migrations.";

const RESOLUTION_STATUSES = ["in_review", "resolved", "rejected"] as const;

interface DisputeRow {
  id: string;
  raised_by: string;
  subject: string | null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateDispute(disputeId: string): void {
  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
}

/**
 * Assign a dispute to the acting staff member.
 */
export async function assignDispute(
  _state: DisputeActionState,
  formData: FormData
): Promise<DisputeActionState> {
  const staff = await requireStaff();
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const disputeId = str(formData, "disputeId");
  if (!disputeId) return { message: "Missing dispute reference." };

  const supabase = await createAdminClient();
  const { data: dispute } = (await supabase
    .from("disputes")
    .select("id, raised_by, subject")
    .eq("id", disputeId)
    .maybeSingle()) as { data: DisputeRow | null };

  if (!dispute) return { message: "Dispute not found." };

  const { error } = await supabase
    .from("disputes")
    .update({ assigned_to: staff.id, updated_at: new Date().toISOString() })
    .eq("id", disputeId);

  if (error) return { message: error.message };

  await notifyUser({
    userId: dispute.raised_by,
    type: "system",
    title: "Dispute assigned",
    body: `Your dispute${
      dispute.subject ? ` "${dispute.subject}"` : ""
    } has been assigned to a reviewer.`,
    link: `/dashboard/disputes/${disputeId}`,
  });

  await logAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: "dispute.assign",
    entityType: "dispute",
    entityId: disputeId,
    metadata: { assigned_to: staff.id },
  });

  revalidateDispute(disputeId);
  return { success: true, message: "Dispute assigned to you." };
}

/**
 * Move a dispute to in_review / resolved / rejected and record the resolution.
 * Any decision notifies the raiser.
 */
export async function resolveDispute(
  _state: DisputeActionState,
  formData: FormData
): Promise<DisputeActionState> {
  const staff = await requireStaff();
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const disputeId = str(formData, "disputeId");
  const status = str(formData, "status");
  const resolution = str(formData, "resolution");

  if (!disputeId) return { message: "Missing dispute reference." };
  if (!(RESOLUTION_STATUSES as readonly string[]).includes(status)) {
    return { message: "Choose a valid dispute status." };
  }
  if (status !== "in_review" && !resolution) {
    return { message: "Add a resolution before resolving or rejecting." };
  }

  const supabase = await createAdminClient();
  const { data: dispute } = (await supabase
    .from("disputes")
    .select("id, raised_by, subject")
    .eq("id", disputeId)
    .maybeSingle()) as { data: DisputeRow | null };

  if (!dispute) return { message: "Dispute not found." };

  const { error } = await supabase
    .from("disputes")
    .update({
      status,
      resolution: resolution || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) return { message: error.message };

  await notifyUser({
    userId: dispute.raised_by,
    type: "system",
    title: `Dispute ${status.replace(/_/g, " ")}`,
    body: resolution || "Your dispute has been moved to review.",
    link: `/dashboard/disputes/${disputeId}`,
  });

  await logAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: "dispute.resolve",
    entityType: "dispute",
    entityId: disputeId,
    metadata: { status },
  });

  revalidateDispute(disputeId);
  return { success: true, message: `Dispute marked ${status.replace(/_/g, " ")}.` };
}
