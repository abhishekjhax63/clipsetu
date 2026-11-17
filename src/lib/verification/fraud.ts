/**
 * Advisory fraud signals for submissions.
 *
 * These checks NEVER auto-reject a submission and NEVER accuse a creator — they
 * only surface information for human review. Signals are honest descriptions of
 * what the recorded data shows; nothing is inferred about intent.
 *
 * Server-only: reads privileged rows via the service-role client.
 */
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface FraudSignal {
  code: string;
  severity: "info" | "warn" | "high";
  detail: string;
}

const SEVERITY_RANK: Record<FraudSignal["severity"], number> = {
  high: 0,
  warn: 1,
  info: 2,
};

const GROWTH_RATIO = 10;
const GROWTH_ABSOLUTE_VIEWS = 500_000;
const GROWTH_WINDOW_HOURS = 6;
const LOW_ENGAGEMENT_VIEWS = 100_000;

interface SubmissionRow {
  id: string;
  post_url: string;
  creator_id: string;
  campaign_id: string;
}

interface MetricsRow {
  submission_id: string;
  view_count: number;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  last_checked_at: string | null;
  created_at: string;
}

/**
 * Pure growth check between two snapshots. Flags either explosive growth
 * (>10×) or a sudden surge (+500,000 views within 6 hours). Returns null when
 * the change is unremarkable.
 */
export function evaluateGrowth(
  previous: number,
  current: number,
  hours: number
): FraudSignal | null {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
  if (current <= previous) return null;

  const delta = current - previous;
  const ratio = previous > 0 ? current / previous : Infinity;

  const explosiveGrowth = previous > 0 && ratio > GROWTH_RATIO;
  const suddenSurge =
    hours > 0 && hours <= GROWTH_WINDOW_HOURS && delta >= GROWTH_ABSOLUTE_VIEWS;

  if (!explosiveGrowth && !suddenSurge) return null;

  const parts: string[] = [];
  if (explosiveGrowth) {
    parts.push(
      `views grew ${ratio.toFixed(1)}x (from ${previous.toLocaleString(
        "en-IN"
      )} to ${current.toLocaleString("en-IN")})`
    );
  }
  if (suddenSurge) {
    parts.push(
      `+${delta.toLocaleString("en-IN")} views in ~${hours.toFixed(1)}h`
    );
  }

  return {
    code: "abnormal_view_growth",
    severity: "warn",
    detail: `Possible abnormal view growth: ${parts.join(
      "; "
    )}. Advisory only — no automatic action taken.`,
  };
}

function hoursBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return (to - from) / (1000 * 60 * 60);
}

/**
 * Assesses a submission for fraud signals. Returns an empty array when nothing
 * is suspicious, otherwise the signals sorted high -> warn -> info.
 */
export async function assessSubmissionFraud(
  submissionId: string
): Promise<FraudSignal[]> {
  if (
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return [];
  }

  try {
    const supabase = await createAdminClient();

    const { data: submission } = (await supabase
      .from("submissions")
      .select("id, post_url, creator_id, campaign_id")
      .eq("id", submissionId)
      .maybeSingle()) as { data: SubmissionRow | null };

    if (!submission) return [];

    const signals: FraudSignal[] = [];

    // 1. The same post URL reused by another submission / creator / campaign.
    const { data: duplicates } = (await supabase
      .from("submissions")
      .select("id, creator_id, campaign_id")
      .eq("post_url", submission.post_url)
      .neq("id", submissionId)) as {
      data: Array<Pick<SubmissionRow, "id" | "creator_id" | "campaign_id">> | null;
    };

    if (duplicates && duplicates.length > 0) {
      const otherCreator = duplicates.some(
        (d) => d.creator_id !== submission.creator_id
      );
      signals.push({
        code: "duplicate_url",
        severity: "warn",
        detail: `This post URL also appears on ${
          duplicates.length
        } other submission(s)${
          otherCreator ? ", including another creator" : ""
        }. Advisory only — please review manually.`,
      });
    }

    // 2. Repeated account abuse: the same creator repeatedly reuses post URLs —
    // either their own across campaigns, or URLs also claimed by other creators.
    // Advisory only; a human decides.
    const { data: ownSubs } = (await supabase
      .from("submissions")
      .select("id, post_url, campaign_id")
      .eq("creator_id", submission.creator_id)
      .limit(200)) as {
      data: Array<{ id: string; post_url: string; campaign_id: string }> | null;
    };

    const own = ownSubs ?? [];

    if (own.length > 1) {
      const urls = Array.from(new Set(own.map((s) => s.post_url)));

      // The same URL submitted for more than one campaign.
      const campaignsByUrl = new Map<string, Set<string>>();
      for (const s of own) {
        const set = campaignsByUrl.get(s.post_url) ?? new Set<string>();
        set.add(s.campaign_id);
        campaignsByUrl.set(s.post_url, set);
      }
      const reusedAcrossCampaigns = Array.from(
        campaignsByUrl.values()
      ).filter((set) => set.size > 1).length;

      // URLs this creator used that other creators also used.
      let crossCreatorUrls = 0;
      if (urls.length > 0) {
        const { data: others } = (await supabase
          .from("submissions")
          .select("post_url")
          .in("post_url", urls)
          .neq("creator_id", submission.creator_id)
          .limit(200)) as { data: Array<{ post_url: string }> | null };
        crossCreatorUrls = new Set((others ?? []).map((o) => o.post_url)).size;
      }

      if (reusedAcrossCampaigns >= 2 || crossCreatorUrls >= 2) {
        const parts: string[] = [];
        if (reusedAcrossCampaigns >= 2) {
          parts.push(
            `${reusedAcrossCampaigns} post URL(s) reused across multiple campaigns`
          );
        }
        if (crossCreatorUrls >= 2) {
          parts.push(
            `${crossCreatorUrls} post URL(s) also claimed by other creators`
          );
        }
        signals.push({
          code: "repeated_account_abuse",
          severity: "high",
          detail: `Possible repeated account abuse: ${parts.join(
            "; "
          )}. Advisory only — no automatic action taken.`,
        });
      }
    }

    // 3. Metrics-based checks on the two most recent snapshots.
    const { data: metrics } = (await supabase
      .from("submission_metrics")
      .select(
        "submission_id, view_count, like_count, comment_count, share_count, last_checked_at, created_at"
      )
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(2)) as { data: MetricsRow[] | null };

    const snapshots = metrics ?? [];

    if (snapshots.length === 0) {
      signals.push({
        code: "no_metrics",
        severity: "info",
        detail:
          "No verification metrics have been recorded for this submission yet.",
      });
    } else {
      const latest = snapshots[0];

      const engagement =
        (latest.like_count ?? 0) +
        (latest.comment_count ?? 0) +
        (latest.share_count ?? 0);

      if (latest.view_count > LOW_ENGAGEMENT_VIEWS && engagement === 0) {
        signals.push({
          code: "low_engagement",
          severity: "info",
          detail: `${latest.view_count.toLocaleString(
            "en-IN"
          )} views but zero likes, comments and shares. Advisory only.`,
        });
      }

      if (snapshots.length >= 2) {
        const previous = snapshots[1];
        const hours = hoursBetween(
          previous.last_checked_at ?? previous.created_at,
          latest.last_checked_at ?? latest.created_at
        );
        const growth = evaluateGrowth(
          previous.view_count,
          latest.view_count,
          hours
        );
        if (growth) signals.push(growth);
      }
    }

    signals.sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    );
    return signals;
  } catch {
    return [];
  }
}
