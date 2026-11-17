import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminEmails,
  getCurrentUser,
  isAdmin,
  type SessionUser,
} from "@/lib/auth";

/**
 * Admin/back-office access control.
 *
 * Access requires ALL of the following (never a secret URL and never a single
 * secret email):
 *   1. an authenticated session,
 *   2. a verified database role of admin | super_admin | moderation, and
 *   3. membership of the server-side ADMIN_EMAILS allowlist.
 *
 * A user whose email is in the allowlist but whose verified DB role is not a
 * staff role is still denied — "a secret email alone must never grant
 * administrator permissions".
 *
 * The admin surface is never linked from the public site.
 */

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/** True when the allowlist itself is configured at all. */
export function isAdminAllowlistConfigured(): boolean {
  return getAdminEmails().length > 0;
}

/** Moderation / support staff (admin, super_admin or moderation). */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user.role)) redirect("/unauthorized");
  return user;
}

/** Full administrator (admin or super_admin) — excludes read-mostly moderation. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireStaff();
  if (user.role === "moderation") redirect("/unauthorized");
  if (!isAdminEmail(user.email)) redirect("/unauthorized");
  return user;
}

/**
 * Whether the current session has stepped up to MFA (AAL2), plus the verified
 * TOTP factor id (when one exists) so the admin gate can run a challenge.
 *
 * When a user has enrolled a verified factor, privileged administration
 * requires AAL2.
 */
export async function mfaState(): Promise<{
  enrolled: boolean;
  satisfied: boolean;
  currentLevel: string | null;
  factorId: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) {
    return {
      enrolled: false,
      satisfied: true,
      currentLevel: null,
      factorId: null,
    };
  }
  const enrolled = data.nextLevel === "aal2";

  let factorId: string | null = null;
  if (enrolled) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    factorId =
      factors?.totp?.find((factor) => factor.status === "verified")?.id ?? null;
  }

  return {
    enrolled,
    satisfied: !enrolled || data.currentLevel === "aal2",
    currentLevel: data.currentLevel ?? null,
    factorId,
  };
}
