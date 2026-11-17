import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  ChartBar,
  CircleCheck,
  Clock,
  ExternalLink,
  FileCheck,
  Info,
  MessageSquare,
  TriangleExclamationPoint,
  Wallet,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { SubmissionStatusBadge } from "@/components/clipper/status-badges";
import { AppealForm } from "@/components/clipper/appeal-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SUBMISSION_STATUS_LABEL,
} from "@/lib/campaigns";
import { computeReward, rewardFormula } from "@/lib/rewards";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";
import { platformLabel } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Submission detail",
  robots: { index: false, follow: false },
};

interface CampaignRel {
  id: string;
  title: string;
  reward_per_1k_views: number;
  min_views: number;
  max_reward_per_submission: number | null;
  remaining_budget: number;
}

interface SubmissionRow {
  id: string;
  campaign_id: string;
  creator_id: string;
  platform: string;
  post_url: string;
  external_post_id: string | null;
  caption: string | null;
  status: string;
  rejection_reason: string | null;
  review_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  campaigns: CampaignRel | CampaignRel[] | null;
}

interface MetricsRow {
  view_count: number;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  metrics_source: string;
  verification_status: string;
  last_checked_at: string | null;
}

interface AppealRow {
  id: string;
  status: string;
  reason: string | null;
  created_at: string;
  decision_notes: string | null;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function provenance(metrics: MetricsRow | null): {
  label: string;
  tone: "success" | "warning" | "secondary" | "danger";
} {
  if (!metrics) return { label: "No metrics recorded yet", tone: "secondary" };
  if (metrics.verification_status === "unavailable") {
    return { label: "Metrics unavailable", tone: "secondary" };
  }
  if (metrics.verification_status === "flagged") {
    return { label: "Metrics flagged", tone: "danger" };
  }
  if (metrics.metrics_source === "manual") {
    return { label: "Manual entry · unverified", tone: "warning" };
  }
  if (metrics.verification_status === "verified") {
    return { label: "API-verified", tone: "success" };
  }
  return { label: "API · pending verification", tone: "warning" };
}

function isVerified(metrics: MetricsRow | null): boolean {
  return Boolean(
    metrics &&
      metrics.metrics_source === "api" &&
      metrics.verification_status === "verified"
  );
}

function TimelineStep({
  icon: Icon,
  title,
  detail,
  done,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  done: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-brand-100 text-brand-700" : "bg-surface-muted text-ink-400"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="text-xs text-ink-400">{detail}</p>
      </div>
    </li>
  );
}

async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Submission details need a backend">
        This page reads live submission data from Supabase. Configure your
        project and apply the migrations to view it.
      </SetupNotice>
    );
  }

  const user = await requireRole("clipper");
  const supabase = await createClient();

  const { data: submissionData } = (await supabase
    .from("submissions")
    .select(
      "id, campaign_id, creator_id, platform, post_url, external_post_id, caption, status, rejection_reason, review_notes, submitted_at, reviewed_at, campaigns(id, title, reward_per_1k_views, min_views, max_reward_per_submission, remaining_budget)"
    )
    .eq("id", id)
    .maybeSingle()) as { data: SubmissionRow | null };

  const submission = submissionData;
  if (!submission || submission.creator_id !== user.id) notFound();

  const campaign = firstRelation(submission.campaigns);

  const [metricsRes, appealRes] = await Promise.all([
    supabase
      .from("submission_metrics")
      .select(
        "view_count, like_count, comment_count, share_count, metrics_source, verification_status, last_checked_at"
      )
      .eq("submission_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("appeals")
      .select("id, status, reason, created_at, decision_notes")
      .eq("submission_id", id)
      .maybeSingle(),
  ]);

  const metrics = (metricsRes.data ?? null) as MetricsRow | null;
  const appeal = (appealRes.data ?? null) as AppealRow | null;
  const prov = provenance(metrics);
  const verified = isVerified(metrics);
  const rate = Number(campaign?.reward_per_1k_views ?? 0);

  const reward = verified
    ? computeReward({
        eligibleViews: Number(metrics?.view_count ?? 0),
        rewardPer1000Views: rate,
        maxRewardPerSubmission: campaign?.max_reward_per_submission ?? null,
        minEligibleViews: Number(campaign?.min_views ?? 0),
        remainingCampaignBudget:
          campaign != null ? Number(campaign.remaining_budget) : null,
        platformFeePercent: PLATFORM_FEE_PERCENT,
      })
    : null;

  const reviewed = submission.reviewed_at != null;

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/submissions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to my submissions
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-ink-500">
            {campaign?.title ?? "Campaign"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {platformLabel(submission.platform)} clip
          </h1>
          <a
            href={submission.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 hover:underline"
          >
            {submission.post_url}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Status timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <TimelineStep
                  icon={FileCheck}
                  title="Submitted"
                  detail={formatDate(submission.submitted_at)}
                  done
                />
                <TimelineStep
                  icon={Clock}
                  title="Under review"
                  detail={
                    submission.reviewed_at
                      ? `Reviewed ${formatDate(submission.reviewed_at)}`
                      : "Awaiting brand review"
                  }
                  done={reviewed}
                />
                <TimelineStep
                  icon={CircleCheck}
                  title={
                    SUBMISSION_STATUS_LABEL[submission.status] ??
                    submission.status.replace(/_/g, " ")
                  }
                  detail="Current status"
                  done={submission.status !== "submitted"}
                />
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ChartBar className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Performance
              </CardTitle>
              <CardDescription>
                Metrics are labelled by source — only API-verified numbers count
                toward rewards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Badge variant={prov.tone}>{prov.label}</Badge>
                {metrics?.last_checked_at ? (
                  <span className="text-xs text-ink-400">
                    Checked {formatDate(metrics.last_checked_at)}
                  </span>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-ink-400">Views</dt>
                  <dd className="text-lg font-semibold text-ink-900">
                    {metrics ? formatNumber(Number(metrics.view_count)) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Likes</dt>
                  <dd className="text-lg font-semibold text-ink-900">
                    {metrics?.like_count != null
                      ? formatNumber(Number(metrics.like_count))
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Comments</dt>
                  <dd className="text-lg font-semibold text-ink-900">
                    {metrics?.comment_count != null
                      ? formatNumber(Number(metrics.comment_count))
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Shares</dt>
                  <dd className="text-lg font-semibold text-ink-900">
                    {metrics?.share_count != null
                      ? formatNumber(Number(metrics.share_count))
                      : "—"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {metrics?.metrics_source === "manual"
                  ? "These numbers were entered manually and are not verified — they do not establish payment eligibility."
                  : "Metrics are collected from official platform APIs where available."}
              </p>
            </CardContent>
          </Card>

          {submission.status === "rejected" ? (
            <Card className="border-danger/20 bg-danger-soft/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-danger">
                  <TriangleExclamationPoint
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-ink-600">
                  {submission.rejection_reason ??
                    "This submission was rejected. No reason was provided."}
                </p>

                {appeal ? (
                  <div className="rounded-xl border border-border-soft bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                        <MessageSquare
                          className="h-4 w-4 text-ink-400"
                          aria-hidden="true"
                        />
                        Appeal
                      </p>
                      <Badge
                        variant={
                          appeal.status === "accepted"
                            ? "success"
                            : appeal.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {appeal.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      Filed {formatDate(appeal.created_at)}
                    </p>
                    {appeal.reason ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-ink-600">
                        {appeal.reason}
                      </p>
                    ) : null}
                    {appeal.decision_notes ? (
                      <p className="mt-3 rounded-lg bg-surface-soft p-3 text-xs text-ink-600">
                        <span className="font-medium text-ink-700">
                          Decision:{" "}
                        </span>
                        {appeal.decision_notes}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <p className="mb-3 text-sm text-ink-600">
                      If you believe this decision is incorrect, you can appeal
                      it.
                    </p>
                    <AppealForm submissionId={submission.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {submission.review_notes ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Reviewer notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-ink-600">
                  {submission.review_notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card className="border-brand-100 bg-brand-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Reward
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-ink-600">
              {reward && reward.eligible ? (
                <>
                  <p className="text-2xl font-bold text-brand-700">
                    {formatINR(reward.net)}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Estimated after {PLATFORM_FEE_PERCENT}% platform fee
                    {reward.cappedBy === "submission_cap"
                      ? " (per-clip cap applied)"
                      : reward.cappedBy === "campaign_budget"
                        ? " (limited by remaining budget)"
                        : ""}
                  </p>
                  <Separator className="my-3" />
                  <p className="text-xs text-ink-500">
                    Final payout is confirmed by the brand on approval.
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-500">
                  {metrics == null
                    ? "No reward yet — no metrics have been recorded for this submission."
                    : !verified
                      ? "No payable reward yet — only API-verified metrics count toward earnings."
                      : (reward?.reason ??
                        "No reward is due at the current verified view count.")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Submission details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ink-600">
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">Platform</span>
                <span className="font-medium text-ink-900">
                  {platformLabel(submission.platform)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">Submitted</span>
                <span className="font-medium text-ink-900">
                  {formatDate(submission.submitted_at)}
                </span>
              </div>
              {campaign ? (
                <div className="flex justify-between gap-3">
                  <span className="text-ink-500">Reward rate</span>
                  <span className="font-medium text-ink-900">
                    {rewardFormula(rate)}
                  </span>
                </div>
              ) : null}
              {submission.caption ? (
                <div>
                  <p className="text-ink-500">Caption</p>
                  <p className="mt-1 whitespace-pre-line text-ink-700">
                    {submission.caption}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning-soft/40">
            <CardContent className="flex items-start gap-2.5 p-4">
              <CalendarClock
                className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-ink-600">
                Submitting a link never verifies views or guarantees payment.
                Even with a large follower base, rewards depend on API-verified
                views.
              </p>
            </CardContent>
          </Card>

          {campaign ? (
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/dashboard/workspace/${campaign.id}`}>
                Open campaign workspace
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-10 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <SubmissionDetail params={params} />
    </Suspense>
  );
}
