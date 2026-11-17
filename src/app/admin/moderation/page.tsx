import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Flag,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  TriangleExclamationPoint,
} from "lucide-react";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  assessSubmissionFraud,
  type FraudSignal,
} from "@/lib/verification/fraud";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/utils";
import { ModerationControls } from "./moderation-controls";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

/** Statuses that are still awaiting a moderation decision. */
const QUEUE_STATUSES = [
  "submitted",
  "pending_review",
  "processing",
  "disputed",
  "revision_requested",
] as const;

interface SubmissionRow {
  id: string;
  status: string;
  platform: string;
  post_url: string;
  submitted_at: string;
  campaign_id: string;
  creator_id: string;
  campaigns: { title: string }[] | { title: string } | null;
}

interface MetricsSnapshot {
  view_count: number | null;
  metrics_source: string | null;
  verification_status: string | null;
  last_checked_at: string | null;
}

interface AppealRow {
  id: string;
  submission_id: string;
  reason: string | null;
  status: string;
  decision_notes: string | null;
  created_at: string;
}

const SEVERITY_VARIANT: Record<FraudSignal["severity"], "danger" | "warning" | "secondary"> =
  {
    high: "danger",
    warn: "warning",
    info: "secondary",
  };

function campaignTitle(
  rel: { title: string }[] | { title: string } | null
): string {
  if (!rel) return "Campaign";
  if (Array.isArray(rel)) return rel[0]?.title ?? "Campaign";
  return rel.title ?? "Campaign";
}

function platformLabel(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

async function ModerationQueue() {
  await requireStaff();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Moderation needs a backend">
        The moderation queue reads live submissions from Supabase. Add your
        project credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to review submissions here — nothing is faked.
      </SetupNotice>
    );
  }

  const supabase = await createAdminClient();

  const { data: submissionsData } = (await supabase
    .from("submissions")
    .select(
      "id, status, platform, post_url, submitted_at, campaign_id, creator_id, campaigns(title)"
    )
    .in("status", [...QUEUE_STATUSES])
    .order("submitted_at", { ascending: false })
    .limit(30)) as { data: SubmissionRow[] | null };

  const submissions = submissionsData ?? [];

  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Moderation queue is clear"
        description="No submissions are waiting for review right now."
      />
    );
  }

  const ids = submissions.map((s) => s.id);
  const creatorIds = Array.from(new Set(submissions.map((s) => s.creator_id)));

  const [metricsRes, appealsRes, creatorsRes, fraudList] = await Promise.all([
    supabase
      .from("submission_metrics")
      .select(
        "submission_id, view_count, metrics_source, verification_status, last_checked_at, created_at"
      )
      .in("submission_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("appeals")
      .select("id, submission_id, reason, status, decision_notes, created_at")
      .in("submission_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("creator_profiles")
      .select("user_id, username, display_name")
      .in("user_id", creatorIds),
    Promise.all(ids.map((id) => assessSubmissionFraud(id))),
  ]);

  // Latest snapshot per submission (rows already ordered newest-first).
  const latestMetrics = new Map<string, MetricsSnapshot>();
  for (const row of (metricsRes.data ?? []) as Array<
    MetricsSnapshot & { submission_id: string }
  >) {
    if (!latestMetrics.has(row.submission_id)) {
      latestMetrics.set(row.submission_id, {
        view_count: row.view_count,
        metrics_source: row.metrics_source,
        verification_status: row.verification_status,
        last_checked_at: row.last_checked_at,
      });
    }
  }

  const appealsBySubmission = new Map<string, AppealRow[]>();
  for (const appeal of (appealsRes.data ?? []) as AppealRow[]) {
    const list = appealsBySubmission.get(appeal.submission_id) ?? [];
    list.push(appeal);
    appealsBySubmission.set(appeal.submission_id, list);
  }

  const usernames = new Map<string, string>();
  for (const creator of (creatorsRes.data ?? []) as Array<{
    user_id: string;
    username: string | null;
    display_name: string | null;
  }>) {
    usernames.set(creator.user_id, creator.username ?? creator.display_name ?? "");
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission, index) => {
        const metrics = latestMetrics.get(submission.id) ?? null;
        const signals = fraudList[index] ?? [];
        const appeals = appealsBySubmission.get(submission.id) ?? [];
        const creator = usernames.get(submission.creator_id) || "Unknown creator";

        return (
          <Card key={submission.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">
                    {campaignTitle(submission.campaigns)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    @{creator} · {platformLabel(submission.platform)} · submitted{" "}
                    {formatDate(submission.submitted_at)}
                  </p>
                </div>
                <AdminStatusBadge status={submission.status} />
              </div>

              <a
                href={submission.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-900 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{submission.post_url}</span>
              </a>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border-soft bg-surface-muted/40 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Latest metrics
                  </p>
                  {metrics ? (
                    <dl className="mt-2 space-y-1 text-xs text-ink-600">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-400">Views</dt>
                        <dd className="font-medium text-ink-900">
                          {formatNumber(Number(metrics.view_count ?? 0))}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-400">Source</dt>
                        <dd className="font-medium capitalize text-ink-900">
                          {metrics.metrics_source ?? "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-400">Verification</dt>
                        <dd>
                          <AdminStatusBadge
                            status={metrics.verification_status ?? "pending"}
                          />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-400">Last checked</dt>
                        <dd className="font-medium text-ink-900">
                          {metrics.last_checked_at
                            ? formatDate(metrics.last_checked_at)
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-ink-500">
                      No metric snapshots recorded yet.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border-soft bg-surface-muted/40 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                    <TriangleExclamationPoint
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    Advisory signals
                  </p>
                  {signals.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-500">
                      No advisory signals. Signals are informational only.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {signals.map((signal) => (
                        <li key={signal.code} className="text-xs text-ink-600">
                          <Badge variant={SEVERITY_VARIANT[signal.severity]}>
                            {signal.code}
                          </Badge>
                          <p className="mt-1 leading-relaxed">{signal.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border-soft bg-surface-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  Appeal history
                </p>
                {appeals.length === 0 ? (
                  <p className="mt-2 text-xs text-ink-500">No appeals raised.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {appeals.map((appeal) => (
                      <li
                        key={appeal.id}
                        className="rounded-lg border border-border-soft bg-surface p-2.5 text-xs text-ink-600"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <AdminStatusBadge status={appeal.status} />
                          <span className="text-ink-400">
                            {formatDate(appeal.created_at)}
                          </span>
                        </div>
                        {appeal.reason ? (
                          <p className="mt-1.5 leading-relaxed text-ink-700">
                            {appeal.reason}
                          </p>
                        ) : null}
                        {appeal.decision_notes ? (
                          <p className="mt-1 leading-relaxed text-ink-500">
                            Decision: {appeal.decision_notes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {signals.length > 0 ? (
                <p className="flex items-start gap-1.5 text-xs text-ink-400">
                  <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Fraud signals are advisory only. No automatic action is taken
                  and creators are never accused automatically.
                </p>
              ) : null}

              <ModerationControls submissionId={submission.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function ModerationPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Moderation
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Submissions awaiting review, their verification evidence and any
            appeals. Rewards are credited only on verified metrics.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Staff only
        </Badge>
      </header>

      <Suspense fallback={<QueueSkeleton />}>
        <ModerationQueue />
      </Suspense>
    </div>
  );
}
