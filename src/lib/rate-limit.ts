/**
 * Server-side rate limiting for abuse-prone endpoints.
 *
 * Backed by the Postgres `check_rate_limit` function (migration 0005) so the
 * limit is shared across every server instance. When Supabase is not configured
 * the limiter fails OPEN (returns allowed) — the auth action itself will then
 * fail with an explicit "not configured" message, so no traffic is let through
 * that would otherwise have been rejected on merit.
 */
import { headers } from "next/headers";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface RateLimitRule {
  /** Logical bucket name, e.g. "login". */
  name: string;
  /** Maximum attempts allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export const RATE_LIMITS = {
  login: { name: "login", limit: 10, windowSeconds: 600 },
  signup: { name: "signup", limit: 5, windowSeconds: 3600 },
  passwordReset: { name: "password_reset", limit: 5, windowSeconds: 3600 },
  /** Sending a login/signup code — capped to stop email bombing. */
  emailOtp: { name: "email_otp", limit: 5, windowSeconds: 3600 },
  /** Guessing a 6-digit code — tighter window, per IP. */
  emailOtpVerify: { name: "email_otp_verify", limit: 10, windowSeconds: 600 },
} as const satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets; 0 when allowed. */
  retryAfter: number;
}

const ALLOWED: RateLimitResult = { allowed: true, remaining: 0, retryAfter: 0 };

function isRateLimitConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Best-effort client IP from proxy headers (Vercel/most proxies set x-forwarded-for). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Consume one unit from `rule` for `identifier`. `identifier` should be an IP
 * and/or a normalized email (e.g. the account being attempted).
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<RateLimitResult> {
  if (!isRateLimitConfigured()) return ALLOWED;

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: `${rule.name}:${identifier.toLowerCase()}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      // Limiter unavailable — fail open rather than lock everyone out.
      return ALLOWED;
    }

    const row = data[0] as {
      allowed: boolean;
      remaining: number;
      retry_after: number;
    };

    return {
      allowed: row.allowed,
      remaining: row.remaining,
      retryAfter: row.retry_after,
    };
  } catch {
    return ALLOWED;
  }
}

/** Human-readable "try again in X" message for a blocked result. */
export function rateLimitMessage(result: RateLimitResult): string {
  const seconds = Math.max(1, result.retryAfter);
  if (seconds >= 60) {
    return `Too many attempts. Please try again in ${Math.ceil(seconds / 60)} minute(s).`;
  }
  return `Too many attempts. Please try again in ${seconds} second(s).`;
}
