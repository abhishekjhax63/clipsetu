"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { USER_ROLES } from "@/lib/constants";

/**
 * Result contract for every user-management action. Consumed by the admin
 * console via `useActionState`. Always honest: `ok:false` carries a message the
 * operator can act on.
 */
export type UserActionState = { ok: boolean; message?: string };

const SETUP_MESSAGE =
  "Supabase is not configured. Add your project credentials and run the migrations in supabase/migrations.";

const USER_STATUSES = ["active", "suspended", "restricted", "pending"] as const;
type UserStatus = (typeof USER_STATUSES)[number];

const BRAND_DECISIONS = [
  "verified",
  "rejected",
  "under_review",
  "suspended",
] as const;
type BrandDecision = (typeof BRAND_DECISIONS)[number];

function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as readonly string[]).includes(value);
}

function isUserRole(value: string): boolean {
  return (USER_ROLES as readonly string[]).includes(value);
}

function isBrandDecision(value: string): value is BrandDecision {
  return (BRAND_DECISIONS as readonly string[]).includes(value);
}

function revalidateUser(userId: string): void {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

// ---------------------------------------------------------------------------
// Account status
// ---------------------------------------------------------------------------

export async function setUserStatus(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const actor = await requireAdmin();

  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const userId = String(formData.get("userId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!userId) return { ok: false, message: "Missing user reference." };
  if (!isUserStatus(status)) {
    return { ok: false, message: "Unknown account status." };
  }

  const supabase = await createAdminClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, email, status")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return { ok: false, message: "User not found." };

  const previous = String((target as { status?: string }).status ?? "");

  const { error } = await supabase
    .from("profiles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };

  await notifyUser({
    userId,
    type: "security",
    title: "Account status updated",
    body:
      status === "active"
        ? "Your ClipSetu account is active."
        : `Your account status was set to ${status}.`,
    link: "/dashboard",
  });

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "user.status_change",
    entityType: "profile",
    entityId: userId,
    metadata: { from: previous, to: status },
  });

  revalidateUser(userId);
  return { ok: true, message: `Account status set to ${status}.` };
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

export async function setUserRole(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const actor = await requireAdmin();

  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const userId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!userId) return { ok: false, message: "Missing user reference." };
  if (!isUserRole(role)) return { ok: false, message: "Unknown role." };

  // Nobody may change their own role — a hard rule regardless of rank.
  if (userId === actor.id) {
    return { ok: false, message: "You cannot change your own role." };
  }

  // Only a super admin may grant administrator roles.
  if (
    (role === "admin" || role === "super_admin") &&
    actor.role !== "super_admin"
  ) {
    return {
      ok: false,
      message: "Only a super admin can grant administrator roles.",
    };
  }

  const supabase = await createAdminClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return { ok: false, message: "User not found." };

  const previous = String((target as { role?: string }).role ?? "");

  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };

  await notifyUser({
    userId,
    type: "system",
    title: "Account role updated",
    body: `Your ClipSetu role was set to ${role.replace(/_/g, " ")}.`,
    link: "/dashboard",
  });

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "user.role_change",
    entityType: "profile",
    entityId: userId,
    metadata: { from: previous, to: role },
  });

  revalidateUser(userId);
  return { ok: true, message: `Role set to ${role.replace(/_/g, " ")}.` };
}

// ---------------------------------------------------------------------------
// Brand verification
// ---------------------------------------------------------------------------

export async function decideBrandVerification(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const actor = await requireAdmin();

  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const userId = String(formData.get("userId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId) return { ok: false, message: "Missing user reference." };
  if (!isBrandDecision(decision)) {
    return { ok: false, message: "Unknown verification decision." };
  }
  if (
    (decision === "rejected" || decision === "suspended") &&
    reason.length < 3
  ) {
    return {
      ok: false,
      message: "A reason is required when rejecting or suspending verification.",
    };
  }

  const supabase = await createAdminClient();

  const { data: brand } = await supabase
    .from("brand_profiles")
    .select("id, verification_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!brand) {
    return { ok: false, message: "This user has no brand profile." };
  }

  const previous = String(
    (brand as { verification_status?: string }).verification_status ?? ""
  );

  const { error } = await supabase
    .from("brand_profiles")
    .update({
      verification_status: decision,
      rejection_reason:
        decision === "rejected" || decision === "suspended"
          ? reason
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) return { ok: false, message: error.message };

  await notifyUser({
    userId,
    type: "system",
    title: "Brand verification updated",
    body:
      decision === "verified"
        ? "Your brand is now verified."
        : `Your brand verification status is now ${decision.replace(/_/g, " ")}.${reason ? ` Reason: ${reason}` : ""}`,
    link: "/dashboard",
  });

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "brand.verification_decision",
    entityType: "profile",
    entityId: userId,
    metadata: { from: previous, to: decision, reason: reason || null },
  });

  revalidateUser(userId);
  return {
    ok: true,
    message: `Brand verification set to ${decision.replace(/_/g, " ")}.`,
  };
}

// ---------------------------------------------------------------------------
// Internal notes (staff-only, stored in the audit trail)
// ---------------------------------------------------------------------------

export async function addInternalNote(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const actor = await requireAdmin();

  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const userId = String(formData.get("userId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!userId) return { ok: false, message: "Missing user reference." };
  if (note.length < 2) return { ok: false, message: "Enter a note." };
  if (note.length > 4000) {
    return { ok: false, message: "Keep the note under 4,000 characters." };
  }

  const supabase = await createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return { ok: false, message: "User not found." };

  // There is no notes table: internal notes live as audit_logs rows and are
  // readable only by admins.
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "internal_note",
    entityType: "profile",
    entityId: userId,
    metadata: { note },
  });

  revalidateUser(userId);
  return { ok: true, message: "Internal note added." };
}
