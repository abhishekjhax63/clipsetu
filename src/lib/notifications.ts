/**
 * Notifications: in-app records + transactional email.
 *
 * In-app notifications are written with the service-role client so server-side
 * events can notify any user. Email is sent through the configured provider
 * (Resend HTTP API). When a provider is not configured we return an explicit
 * reason instead of pretending a message was sent.
 */
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type NotificationType =
  | "campaign"
  | "submission"
  | "reward"
  | "payout"
  | "verification"
  | "security"
  | "support"
  | "system";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** In-app relative link, e.g. "/dashboard/submissions/abc". */
  link?: string;
  metadata?: Record<string, unknown>;
}

export function isNotificationsConfigured(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function notifyUser(
  input: NotifyInput
): Promise<{ created: boolean }> {
  if (!isNotificationsConfigured()) return { created: false };

  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: input.metadata ?? null,
      read: false,
    });
    return { created: !error };
  } catch {
    return { created: false };
  }
}

/** Notifies several users, tolerating individual failures. */
export async function notifyUsers(
  userIds: string[],
  payload: Omit<NotifyInput, "userId">
): Promise<void> {
  await Promise.all(
    userIds.map((userId) => notifyUser({ ...payload, userId }))
  );
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  sent: boolean;
  reason?: "not_configured" | "provider_error" | "network_error";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendTransactionalEmail(
  input: EmailInput
): Promise<EmailResult> {
  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "noreply@clipsetu.com",
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) return { sent: false, reason: "provider_error" };
    return { sent: true };
  } catch {
    return { sent: false, reason: "network_error" };
  }
}

/** Minimal, safe HTML wrapper. Avoids injecting untrusted HTML markup. */
export function emailLayout(title: string, bodyLines: string[]): string {
  const escaped = bodyLines
    .map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`)
    .join("");
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f6f7f9;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #eceef1">
      <h1 style="font-size:18px;margin:0 0 16px;color:#0b0f10">${escapeHtml(title)}</h1>
      ${escaped}
      <p style="margin:24px 0 0;font-size:12px;color:#8a9199">ClipSetu — Create. Clip. Publish. Earn.</p>
    </div>
  </body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// In-app + email delivery (opt-in)
// ---------------------------------------------------------------------------

/**
 * Writes an in-app notification and — only when the user has explicitly enabled
 * email delivery and a provider is configured — sends a transactional email.
 *
 * Email is attempted ONLY when all of the following hold:
 *   * the caller supplied a non-empty `email` recipient;
 *   * the user's `notification_preferences` row has `email === true` (a missing
 *     or unreadable row is treated as disabled — we never email without consent);
 *   * a transactional email provider (Resend) is configured.
 *
 * Never throws; returns honest flags plus a reason when no email was sent.
 */
export async function notifyUserWithEmail(
  input: NotifyInput & {
    email?: string | null;
    subject?: string;
    bodyLines?: string[];
  }
): Promise<{ created: boolean; emailed: boolean; emailReason?: string }> {
  const { created } = await notifyUser(input);

  const recipient = typeof input.email === "string" ? input.email.trim() : "";
  if (!recipient) {
    return { created, emailed: false, emailReason: "no_recipient" };
  }

  if (!isEmailConfigured()) {
    return { created, emailed: false, emailReason: "email_not_configured" };
  }

  let emailEnabled = false;
  try {
    const supabase = await createAdminClient();
    const { data } = (await supabase
      .from("notification_preferences")
      .select("email")
      .eq("user_id", input.userId)
      .maybeSingle()) as { data: { email: boolean } | null };
    emailEnabled = data?.email === true;
  } catch {
    // Fail closed: never email when we cannot confirm the user's consent.
    emailEnabled = false;
  }

  if (!emailEnabled) {
    return { created, emailed: false, emailReason: "email_disabled" };
  }

  const subject = input.subject ?? input.title;
  const bodyLines = input.bodyLines ?? (input.body ? [input.body] : []);

  try {
    const result = await sendTransactionalEmail({
      to: recipient,
      subject,
      html: emailLayout(subject, bodyLines),
    });
    return result.sent
      ? { created, emailed: true }
      : {
          created,
          emailed: false,
          emailReason: result.reason ?? "provider_error",
        };
  } catch {
    return { created, emailed: false, emailReason: "network_error" };
  }
}
