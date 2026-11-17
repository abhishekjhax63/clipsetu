import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Inbox,
  MessageSquare,
  Share2,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { SubmissionReviewControls } from "@/components/brand/submission-review-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_TONE,
  type BadgeTone,
} from "@/lib/campaigns";
import { formatDate, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Submission review",
  robots: { index: false, follow: false },
};

interface CampaignRow {
  id: string;
  brand_id: string;
  title: string;
  status: string;
}

interface SubmissionRow {
  id: string;
  creator_id: string;
  platform: string;
  post_url: string;
  caption: string | null;
  status: string;
  rejection_reason: string | null;
  review_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

interface MetricRow {
  submission_id: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  metrics_source: string;
  verification_status: string;
  last_checked_at: string | null;
  created_at: string;
}

interface CreatorInfo {
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

/** Statuses for which a brand decision can still be applied. */
const REVIEWABLE_STATUSES = [
  "submitted",
  "pending_review",
  "processing",
  "metrics_unavailable",
  "disputed",
];

/**
 * Reading another user's profile is blocked by RLS, so creator identity is
 * enriched with the service-role client when it is available — purely for
 * display. It never fabricates data: without the key (or on error) names fall
 * back to a neutral label.
 */
function creatorDirectoryConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getCreatorDirectory(
  ids: string[]
): Promise<Map<string, CreatorInfo>> {
  const directory = new Map<string, CreatorInfo>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0 || !creatorDirectoryConfigured()) return directory;

  try {
    const admin = await createAdminClient();
    const [profilesRes, creatorsRes] = await Promise.all([
      admin.from("profiles").select("id, full_name, avatar_url").in("id", unique),
      admin
        .from("creator_profiles")
        .select("user_id, username, display_name, profile_picture_url")
        .in("user_id", unique),
    ]);

    const profiles = (profilesRes.data ?? []) as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    }[];
    const creators = (creatorsRes.data ?? []) as {
      user_id: string;
      username: string | null;
      display_name: string | null;
      profile_picture_url: string | null;
    }[];

    const creatorByUser = new Map(creators.map((c) => [c.user_id, c]));
    for (const profile of profiles) {
      const creator = creatorByUser.get(profile.id);
      directory.set(profile.id, {
        name: creator?.display_name ?? profile.full_name ?? null,
        username: creator?.username ?? null,
        avatarUrl: creator?.profile_picture_url ?? profile.avatar_url ?? null,
      });
    }
  } catch {
    // Enrichment is best-effort; never block rendering on it.
  }

  return directory;
}

/** Maps the latest metric row to an honest provenance label. */
function metricProvenance(metric: MetricRow | undefined): {
  label: string;
  tone: BadgeTone;
  showNumbers: boolean;
} {
  if (!metric) {
    return { label: "No metrics", tone: "secondary", showNumbers: false };
  }
  if (metric.verification_status === "unavailable") {
    return { label: "Unavailable", tone: "warning", showNumbers: false };
  }
  if (metric.verification_status === "flagged") {
    return { label: "Flagged", tone: "danger", showNumbers: true };
  }
  if (metric.metrics_source === "api") {
    const verified = metric.verification_status === "verified";
    return {
      label: verified ? "API · verified" : "API · pending",
      tone: verified ? "success" : "info",
      showNumbers: true,
    };
  }
  return { label: "Manual entry", tone: "warning", showNumbers: true };
}

function MetricStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-ink-900">
        {value}
      </p>
    </div>
  );
}

function initialsFor(name: string | null, fallback: string): string {
  const source = name?.trim() || fallback;
  return source.slice(0, 2).toUpperCase();
}

async function SubmissionsReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("brand");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Submission review needs a backend">
        Reviewing submissions reads live data from Supabase. Configure your
        project and apply the migrations to review real submissions.
      </SetupNotice>
    );
  }

  const supabase = await createClient();

  const { data: campaignData } = await supabase
    .from("campaigns")
    .select("id, brand_id, title, status")
    .eq("id", id)
    .maybeSingle();

  const campaign = campaignData as CampaignRow | null;
  if (!campaign || campaign.brand_id !== user.id) notFound();

  const { data: subsData } = await supabase
    .from("submissions")
    .select(
      "id, creator_id, platform, post_url, caption, status, rejection_reason, review_notes, submitted_at, reviewed_at"
    )
    .eq("campaign_id", id)
    .order("submitted_at", { ascending: false });

  const submissions = (subsData ?? []) as SubmissionRow[];

  const metricsBySubmission = new Map<string, MetricRow>();
  if (submissions.length > 0) {
    const { data: metricsData } = await supabase
      .from("submission_metrics")
      .select(
        "submission_id, view_count, like_count, comment_count, share_count, metrics_source, verification_status, last_checked_at, created_at"
      )
      .in(
        "submission_id",
        submissions.map((s) => s.id)
      )
      .order("created_at", { ascending: false });

    for (const metric of (metricsData ?? []) as MetricRow[]) {
      // Ordered newest-first, so the first row per submission is the latest.
      if (!metricsBySubmission.has(metric.submission_id)) {
        metricsBySubmission.set(metric.submission_id, metric);
      }
    }
  }

  const creators = await getCreatorDirectory(
    submissions.map((s) => s.creator_id)
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/campaigns/${campaign.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to campaign
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Submissions
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {campaign.title} · {formatNumber(submissions.length)} submission
              {submissions.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/dashboard/campaigns/${campaign.id}`}>
              View campaign
            </Link>
          </Button>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <Inbox className="h-7 w-7 text-ink-300" aria-hidden="true" />
              <p className="mt-3 font-semibold text-ink-900">
                No submissions yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-ink-500">
                Once creators submit clips to this campaign they will appear here
                for review.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {submissions.map((submission) => {
            const creator = creators.get(submission.creator_id);
            const displayName =
              creator?.name ?? creator?.username ?? "Creator";
            const metric = metricsBySubmission.get(submission.id);
            const provenance = metricProvenance(metric);
            const reviewable = REVIEWABLE_STATUSES.includes(submission.status);

            return (
              <li key={submission.id}>
                <Card>
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          {creator?.avatarUrl ? (
                            <AvatarImage
                              src={creator.avatarUrl}
                              alt=""
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback>
                            {initialsFor(creator?.name ?? null, displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-900">
                            {displayName}
                          </p>
                          {creator?.username ? (
                            <p className="truncate text-xs text-ink-400">
                              @{creator.username}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {submission.platform}
                        </Badge>
                        <Badge
                          variant={
                            SUBMISSION_STATUS_TONE[submission.status] ??
                            "secondary"
                          }
                        >
                          {SUBMISSION_STATUS_LABEL[submission.status] ??
                            submission.status}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Submitted {formatDate(submission.submitted_at)}
                      </span>
                      {submission.reviewed_at ? (
                        <span>
                          Reviewed {formatDate(submission.reviewed_at)}
                        </span>
                      ) : null}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <a
                      href={submission.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-900 underline-offset-4 hover:underline"
                    >
                      <span className="truncate">{submission.post_url}</span>
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    </a>

                    {submission.caption ? (
                      <p className="whitespace-pre-wrap text-sm text-ink-600">
                        {submission.caption}
                      </p>
                    ) : null}

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                          Latest metrics
                        </span>
                        <Badge variant={provenance.tone}>
                          {provenance.label}
                        </Badge>
                        {metric?.last_checked_at ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            checked {timeAgo(metric.last_checked_at)}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MetricStat
                          icon={Eye}
                          label="Views"
                          value={
                            provenance.showNumbers
                              ? formatNumber(Number(metric?.view_count ?? 0))
                              : "—"
                          }
                        />
                        <MetricStat
                          icon={Heart}
                          label="Likes"
                          value={
                            provenance.showNumbers && metric?.like_count != null
                              ? formatNumber(metric.like_count)
                              : "—"
                          }
                        />
                        <MetricStat
                          icon={MessageSquare}
                          label="Comments"
                          value={
                            provenance.showNumbers &&
                            metric?.comment_count != null
                              ? formatNumber(metric.comment_count)
                              : "—"
                          }
                        />
                        <MetricStat
                          icon={Share2}
                          label="Shares"
                          value={
                            provenance.showNumbers && metric?.share_count != null
                              ? formatNumber(metric.share_count)
                              : "—"
                          }
                        />
                      </div>
                    </div>

                    {submission.rejection_reason || submission.review_notes ? (
                      <div className="space-y-1 rounded-xl border border-border-soft bg-surface-muted/40 p-3 text-sm">
                        {submission.rejection_reason ? (
                          <p className="text-ink-700">
                            <span className="font-semibold text-ink-900">
                              Rejection reason:{" "}
                            </span>
                            {submission.rejection_reason}
                          </p>
                        ) : null}
                        {submission.review_notes ? (
                          <p className="text-ink-700">
                            <span className="font-semibold text-ink-900">
                              Review notes:{" "}
                            </span>
                            {submission.review_notes}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {reviewable ? (
                      <SubmissionReviewControls submissionId={submission.id} />
                    ) : (
                      <p className="text-sm text-ink-400">
                        This submission has a final decision. No further review is
                        available.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function SubmissionsReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <SubmissionsReview params={params} />
    </Suspense>
  );
}
