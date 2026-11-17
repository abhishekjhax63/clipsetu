"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * MFA (TOTP) server actions for privileged administrators.
 *
 * Privileged admin surfaces are gated on a verified TOTP factor and an AAL2
 * session. These actions let staff enrol an authenticator the first time and
 * complete the step-up challenge afterwards. All calls re-check `requireStaff()`
 * so they can never be driven by an unauthenticated request.
 */
export interface MfaActionState {
  error?: string;
  /** Data-URL SVG QR code shown during enrolment. */
  qrCode?: string;
  /** Manual entry secret shown during enrolment. */
  secret?: string;
  /** Factor id returned by Supabase for the pending enrolment. */
  factorId?: string;
  /** Set when the challenge succeeded (session is now AAL2). */
  ok?: boolean;
}

const CODE_PATTERN = /^[0-9]{6}$/;

function readCode(formData: FormData): string {
  return String(formData.get("code") ?? "").trim();
}

/** Start enrolling a new TOTP factor. Returns the QR code + secret to display. */
export async function beginTotpEnrollment(): Promise<MfaActionState> {
  const user = await requireStaff();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `ClipSetu Admin — ${user.email}`,
  });

  if (error || !data) {
    return { error: error?.message ?? "Could not start MFA enrolment." };
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/** Complete enrolment by verifying the first code from the authenticator app. */
export async function confirmTotpEnrollment(
  _state: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  await requireStaff();

  const factorId = String(formData.get("factorId") ?? "");
  const code = readCode(formData);

  if (!factorId) return { error: "Missing enrolment reference. Start again." };
  if (!CODE_PATTERN.test(code)) {
    return { error: "Enter the 6-digit code from your authenticator app." };
  }

  const supabase = await createClient();
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return {
      error: challengeError?.message ?? "Could not start the MFA challenge.",
    };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

/** Step up an existing factored session to AAL2. */
export async function verifyTotpChallenge(
  _state: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  await requireStaff();

  const factorId = String(formData.get("factorId") ?? "");
  const code = readCode(formData);

  if (!factorId) return { error: "Missing factor reference. Sign in again." };
  if (!CODE_PATTERN.test(code)) {
    return { error: "Enter the 6-digit code from your authenticator app." };
  }

  const supabase = await createClient();
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return {
      error: challengeError?.message ?? "Could not start the MFA challenge.",
    };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
