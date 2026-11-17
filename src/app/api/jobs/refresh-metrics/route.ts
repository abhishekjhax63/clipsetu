import { NextResponse } from "next/server";
import { refreshStaleMetrics } from "@/lib/verification/refresh";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Cron/job endpoint that refreshes stale submission metrics and prunes expired
 * rate-limit buckets.
 *
 * Protected by a bearer secret (CRON_SECRET). When the secret is not configured
 * we fail closed with 503 so a misconfigured deployment is obvious rather than
 * silently open.
 */

const REFRESH_LIMIT = 20;
const RATE_LIMIT_RETENTION_SECONDS = 86_400;

/** Best-effort housekeeping. Never fails the job. */
async function pruneRateLimits(): Promise<number> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 0;
  }
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.rpc("prune_rate_limits", {
      p_older_than_seconds: RATE_LIMIT_RETENTION_SECONDS,
    });
    if (error) return 0;
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}

async function runRefresh(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        reason: "not_configured",
        message: "CRON_SECRET is not set",
      },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized", message: "Unauthorized" },
      { status: 401 }
    );
  }

  const counts = await refreshStaleMetrics(REFRESH_LIMIT);
  const prunedRateLimits = await pruneRateLimits();
  return NextResponse.json(
    { ok: true, ...counts, prunedRateLimits },
    { status: 200 }
  );
}

export async function POST(request: Request): Promise<Response> {
  return runRefresh(request);
}

export async function GET(request: Request): Promise<Response> {
  return runRefresh(request);
}
