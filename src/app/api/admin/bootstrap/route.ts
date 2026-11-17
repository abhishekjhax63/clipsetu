import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/admin/bootstrap
 *
 * One-time, secure super-admin bootstrap. Promotion requires ALL of:
 *   1. BOOTSTRAP_ADMIN_SECRET configured (503 when unset),
 *   2. an authenticated session (401 when absent),
 *   3. a matching `x-bootstrap-secret` header (403 otherwise), compared in
 *      constant time, and
 *   4. the authenticated user's email in the ADMIN_EMAILS allowlist (403
 *      otherwise).
 *
 * Both the secret AND the allowlist are mandatory: a secret alone, or an
 * allowlisted email alone, never grants administrator permissions. No admin
 * email or password is ever hardcoded.
 */
function fail(
  reason: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json({ ok: false, reason, message }, { status });
}

/** Constant-time, length-independent comparison of two secret strings. */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.BOOTSTRAP_ADMIN_SECRET;

  if (!secret) {
    return fail(
      "not_configured",
      "Set BOOTSTRAP_ADMIN_SECRET, bootstrap once, then remove it.",
      503
    );
  }

  if (!isSupabaseConfigured()) {
    return fail(
      "not_configured",
      "Supabase is not configured. Add your project credentials first.",
      503
    );
  }

  const provided = request.headers.get("x-bootstrap-secret") ?? "";
  if (!provided || !safeEqual(provided, secret)) {
    return fail("forbidden", "Invalid bootstrap secret.", 403);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail(
      "unauthenticated",
      "Sign in with the account to promote, then retry.",
      401
    );
  }

  if (!isAdminEmail(user.email)) {
    return fail(
      "forbidden",
      "Your email is not in the ADMIN_EMAILS allowlist.",
      403
    );
  }

  const admin = await createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "super_admin", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return fail("update_failed", error.message, 500);
  }

  await logAudit({
    actorId: user.id,
    actorRole: "super_admin",
    action: "admin.bootstrap",
    entityType: "profile",
    entityId: user.id,
    metadata: { via: "BOOTSTRAP_ADMIN_SECRET" },
  });

  // SECURITY: remove BOOTSTRAP_ADMIN_SECRET from the environment IMMEDIATELY
  // after this one-time promotion succeeds. Leaving it configured keeps a
  // standing privilege-escalation path for any allowlisted account.
  return NextResponse.json({ ok: true, promoted: user.id }, { status: 200 });
}
