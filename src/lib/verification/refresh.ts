/**
 * Server-side metric refresh for submissions.
 *
 * Design rules (from the spec):
 *   * We ONLY ever use the official adapters in this folder — never scraping and
 *     never fabricating numbers.
 *   * When the platform adapter is not configured, or the provider fails, we do
 *     NOT write numbers. The submission_metrics row (when one exists) is marked
 *     honestly as `unavailable` (or `pending` for a transient rate limit).
 *   * This module uses the service-role client because submission_metrics has no
 *     end-user write RLS policy. It NEVER changes submissions.status and NEVER
 *     credits rewards — it only records verification evidence.
 *
 * Metrics are appended as immutable snapshots so fraud review can compare the
 * two most recent readings. Only the *status* of an existing row is updated when
 * no new verified numbers are available.
 */
import "server-only";

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/verification";

export interface RefreshResult {
  ok: boolean;
  reason?: string;
  views?: number;
  source?: "api" | "manual";
  verificationStatus?: "pending" | "verified" | "unavailable" | "flagged";
}

type VerificationStatus = NonNullable<RefreshResult["verificationStatus"]>;

/** Submissions whose rewards may still move are worth refreshing. */
const STALE_STATUSES = [
  "submitted",
  "pending_review",
  "processing",
  "approved",
] as const;

/** A submission is only re-checked once every 6 hours. */
const STALE_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Upper bound on how many candidate submissions we scan per run. */
const MAX_CANDIDATES = 300;

interface SubmissionRow {
  id: string;
  platform: string;
  post_url: string;
  external_post_id: string | null;
  campaign_id: string;
  status: string;
}

interface MetricsRow {
  submission_id: string;
  last_checked_at: string | null;
  created_at: string;
}

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

/** True when the server has the credentials needed to read/write metrics. */
export function isRefreshConfigured(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

async function latestMetricsId(
  supabase: AdminClient,
  submissionId: string
): Promise<string | null> {
  const { data } = (await supabase
    .from("submission_metrics")
    .select("id")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null };
  return data?.id ?? null;
}

/**
 * Updates ONLY the verification status of the most recent metrics row (when one
 * exists). No numbers are ever written here.
 */
async function markVerificationStatus(
  supabase: AdminClient,
  submissionId: string,
  status: Extract<VerificationStatus, "pending" | "unavailable">
): Promise<void> {
  const id = await latestMetricsId(supabase, submissionId);
  if (!id) return;
  await supabase
    .from("submission_metrics")
    .update({
      verification_status: status,
      last_checked_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/**
 * Refreshes the metrics for a single submission via its official platform
 * adapter. Never fabricates numbers and never changes the submission status.
 */
export async function refreshSubmissionMetrics(
  submissionId: string
): Promise<RefreshResult> {
  if (!isRefreshConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      verificationStatus: "unavailable",
    };
  }

  try {
    const supabase = await createAdminClient();

    const { data: submission } = (await supabase
      .from("submissions")
      .select("id, platform, post_url, external_post_id, campaign_id, status")
      .eq("id", submissionId)
      .maybeSingle()) as { data: SubmissionRow | null };

    if (!submission) return { ok: false, reason: "not_found" };

    const adapter = getAdapter(submission.platform);
    if (!adapter || !adapter.isConfigured()) {
      await markVerificationStatus(supabase, submissionId, "unavailable");
      return {
        ok: false,
        reason: "not_configured",
        verificationStatus: "unavailable",
      };
    }

    const externalId =
      submission.external_post_id ??
      adapter.validatePostUrl(submission.post_url).externalId;

    const result = await adapter.fetchMetrics({
      url: submission.post_url,
      externalId: externalId ?? undefined,
      accessToken: null,
    });

    if (!result.ok || !result.metrics) {
      const reason = result.reason ?? "provider_error";
      // A rate limit is transient — keep it pending rather than giving up.
      const status: Extract<VerificationStatus, "pending" | "unavailable"> =
        reason === "rate_limited" ? "pending" : "unavailable";
      await markVerificationStatus(supabase, submissionId, status);
      return { ok: false, reason, verificationStatus: status };
    }

    const metrics = result.metrics;
    const { error } = await supabase.from("submission_metrics").insert({
      submission_id: submissionId,
      view_count: metrics.views,
      like_count: metrics.likes,
      comment_count: metrics.comments,
      share_count: metrics.shares,
      last_checked_at: new Date().toISOString(),
      metrics_source: "api",
      verification_confidence: 1,
      verification_status: "verified",
      raw: result,
    });

    if (error) {
      return {
        ok: false,
        reason: "write_failed",
        verificationStatus: "unavailable",
      };
    }

    return {
      ok: true,
      views: metrics.views,
      source: "api",
      verificationStatus: "verified",
    };
  } catch {
    return { ok: false, reason: "error", verificationStatus: "unavailable" };
  }
}

/**
 * Refreshes metrics for up to `limit` submissions whose latest reading is older
 * than 6 hours. Per-submission failures are swallowed so a single bad row never
 * aborts the batch.
 */
export async function refreshStaleMetrics(
  limit = 20
): Promise<{ processed: number; verified: number; unavailable: number }> {
  const counts = { processed: 0, verified: 0, unavailable: 0 };
  if (!isRefreshConfigured() || limit <= 0) return counts;

  try {
    const supabase = await createAdminClient();

    const { data: candidates } = (await supabase
      .from("submissions")
      .select("id, platform, post_url, external_post_id, campaign_id, status")
      .in("status", [...STALE_STATUSES])
      .order("created_at", { ascending: true })
      .limit(MAX_CANDIDATES)) as { data: SubmissionRow[] | null };

    const rows = candidates ?? [];
    if (rows.length === 0) return counts;

    const ids = rows.map((row) => row.id);
    const { data: metricRows } = (await supabase
      .from("submission_metrics")
      .select("submission_id, last_checked_at, created_at")
      .in("submission_id", ids)
      .order("created_at", { ascending: false })) as {
      data: MetricsRow[] | null;
    };

    // First row seen per submission (descending order) is the latest reading.
    const latestChecked = new Map<string, string | null>();
    for (const row of metricRows ?? []) {
      if (!latestChecked.has(row.submission_id)) {
        latestChecked.set(row.submission_id, row.last_checked_at);
      }
    }

    const cutoff = Date.now() - STALE_WINDOW_MS;

    for (const row of rows) {
      if (counts.processed >= limit) break;

      const checkedAt = latestChecked.get(row.id);
      if (checkedAt && new Date(checkedAt).getTime() > cutoff) continue;

      let result: RefreshResult;
      try {
        result = await refreshSubmissionMetrics(row.id);
      } catch {
        continue;
      }

      counts.processed += 1;
      if (result.verificationStatus === "verified") counts.verified += 1;
      else if (result.verificationStatus === "unavailable") {
        counts.unavailable += 1;
      }
    }

    return counts;
  } catch {
    return counts;
  }
}
