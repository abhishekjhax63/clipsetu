import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  AtSign,
  Bell,
  CalendarClock,
  ChartBar,
  CircleCheck,
  Clapperboard,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Image as ImageIcon,
  Link2,
  ListChecks,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleExclamationPoint,
  Wallet,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { CampaignStatusBadge, SubmissionStatusBadge } from "@/components/clipper/status-badges";
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
import { CAMPAIGN_TYPE_LABEL } from "@/lib/campaigns";
import { computeReward, rewardFormula } from "@/lib/rewards";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatDate, formatINR, formatNumber, timeAgo } from "@/lib/utils";
import { platformLabel } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Campaign workspace",
  robots: { index: false, follow: false },
};

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  category: string | null;
  type: string;
  objective: string | null;
  description: string | null;
  remaining_budget: number;
  reward_per_1k_views: number;
  max_reward_per_submission: number | null;
  min_views: number;
  max_submissions_per_creator: number | null;
  submission_deadline: string | null;
}

interface RulesRow {
  platforms: string[] | null;
  required_hashtags: string[] | null;
  required_mentions: string[] | null;
  caption_requirements: string | null;
  content_restrictions: string | null;
  mandatory_branding: string | null;
  prohibited_content: string | null;
  disclosure_required: boolean;
}

interface AssetRow {
  id: string;
  type: string;
  url: string | null;
  filename: string | null;
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

interface SubmissionRow {
  id: string;
  platform: string;
  post_url: string;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
  submission_metrics: MetricsRow[] | MetricsRow | null;
}

interface NotificationRow {
  id: string;
  title: string | null;
  body: string | null;
  link: string | null;
  created_at: string;
}

const ASSET_META: Record<string, { label: string; icon: LucideIcon }> = {
  video: { label: "Source video", icon: Clapperboard },
  image: { label: "Image", icon: ImageIcon },
  logo: { label: "Brand logo", icon: Sparkles },
  document: { label: "Document", icon: FileText },
  reference: { label: "Reference link", icon: Link2 },
};

function metricsOf(row: SubmissionRow): MetricsRow | null {
  if (Array.isArray(row.submission_metrics)) {
    return row.submission_metrics[0] ?? null;
  }
  return row.submission_metrics;
}

function provenance(metrics: MetricsRow | null): {
  label: string;
  tone: "success" | "warning" | "secondary" | "danger";
} {
  if (!metrics) return { label: "No metrics yet", tone: "secondary" };
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

function RulePills({ items, icon: Icon }: { items: string[]; icon: LucideIcon }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="gap-1">
          <Icon className="h-3 w-3" aria-hidden="true" />
          {item}
        </Badge>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-sm font-medium text-ink-900 sm:text-right">{value}</dd>
    </div>
  );
}

async function Workspace({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="The workspace needs a backend">
        Your campaign workspace reads live data from Supabase. Configure your
        project and apply the migrations to use it — nothing here is faked.
      </SetupNotice>
    );
  }

  const user = await requireRole("clipper");
  const supabase = await createClient();

  const { data: membership } = (await supabase
    .from("campaign_memberships")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("creator_id", user.id)
    .maybeSingle()) as { data: { id: string; status: string } | null };

  if (!membership || membership.status !== "joined") {
    redirect(`/campaigns/${campaignId}`);
  }

  const { data: campaignData } = (await supabase
    .from("campaigns")
    .select(
      "id, title, status, category, type, objective, description, remaining_budget, reward_per_1k_views, max_reward_per_submission, min_views, max_submissions_per_creator, submission_deadline"
    )
    .eq("id", campaignId)
    .maybeSingle()) as { data: CampaignRow | null };

  const campaign = campaignData;
  if (!campaign) redirect(`/campaigns/${campaignId}`);

  const [rulesRes, assetsRes, submissionsRes, notificationsRes] =
    await Promise.all([
      supabase
        .from("campaign_rules")
        .select(
          "platforms, required_hashtags, required_mentions, caption_requirements, content_restrictions, mandatory_branding, prohibited_content, disclosure_required"
        )
        .eq("campaign_id", campaignId)
        .maybeSingle(),
      supabase
        .from("campaign_assets")
        .select("id, type, url, filename")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true }),
      supabase
        .from("submissions")
        .select(
          "id, platform, post_url, status, rejection_reason, submitted_at, submission_metrics(view_count, like_count, comment_count, share_count, metrics_source, verification_status, last_checked_at)"
        )
        .eq("campaign_id", campaignId)
        .eq("creator_id", user.id)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("id, title, body, link, created_at")
        .eq("user_id", user.id)
        .contains("metadata", { campaign_id: campaignId })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const rules = (rulesRes.data ?? null) as RulesRow | null;
  const assets = (assetsRes.data ?? []) as AssetRow[];
  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];
  const notifications = (notificationsRes.data ?? []) as NotificationRow[];

  const rate = Number(campaign.reward_per_1k_views);
  const limit = campaign.max_submissions_per_creator;
  const used = submissions.length;
  const remaining = limit != null ? Math.max(0, limit - used) : null;
  const deadlinePassed =
    campaign.submission_deadline != null &&
    new Date(campaign.submission_deadline).getTime() < new Date().getTime();
  const canSubmit = !deadlinePassed && (remaining == null || remaining > 0);

  // Totals are computed ONLY from API-verified metrics. Manual/unverified
  // numbers are excluded and never presented as earnings.
  let verifiedViews = 0;
  let estimatedReward = 0;
  for (const submission of submissions) {
    const metrics = metricsOf(submission);
    if (metrics && isVerified(metrics)) {
      verifiedViews += Number(metrics.view_count) || 0;
      const reward = computeReward({
        eligibleViews: Number(metrics.view_count) || 0,
        rewardPer1000Views: rate,
        maxRewardPerSubmission: campaign.max_reward_per_submission,
        minEligibleViews: campaign.min_views,
        remainingCampaignBudget: Number(campaign.remaining_budget),
        platformFeePercent: PLATFORM_FEE_PERCENT,
      });
      estimatedReward += reward.net;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/discover"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to discovery
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CampaignStatusBadge status={campaign.status} />
              <Badge variant="outline">
                {CAMPAIGN_TYPE_LABEL[campaign.type] ?? campaign.type}
              </Badge>
              {campaign.category ? (
                <Badge variant="outline">{campaign.category}</Badge>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              {campaign.title}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              You have joined this campaign. Submit from here once your clip is
              live.
            </p>
          </div>
          {canSubmit ? (
            <Button asChild>
              <Link href={`/dashboard/submissions/new?campaign=${campaign.id}`}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Submit a clip
              </Link>
            </Button>
          ) : (
            <Badge variant="warning" className="w-fit">
              {deadlinePassed ? "Deadline passed" : "Submission limit reached"}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-ink-500">Submissions used</p>
            <p className="mt-2 text-xl font-bold text-ink-900">
              {formatNumber(used)}
              {limit != null ? ` / ${formatNumber(limit)}` : ""}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {limit == null
                ? "No per-creator limit on this campaign"
                : remaining != null
                  ? `${formatNumber(remaining)} remaining`
                  : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-500">
                Verified views
              </p>
              <ChartBar className="h-4 w-4 text-ink-400" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xl font-bold text-ink-900">
              {formatNumber(verifiedViews)}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              From API-verified metrics only
            </p>
          </CardContent>
        </Card>
        <Card className="border-brand-100 bg-brand-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-500">
                Estimated rewards
              </p>
              <Wallet className="h-4 w-4 text-brand-600" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xl font-bold text-brand-700">
              {formatINR(estimatedReward)}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              After {PLATFORM_FEE_PERCENT}% fee · confirmed by the brand after
              review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Your submissions</CardTitle>
                <CardDescription>
                  Published clips, their review status and verified performance
                </CardDescription>
              </div>
              <ListChecks className="h-4 w-4 text-ink-400" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                  <Clapperboard
                    className="h-7 w-7 text-ink-300"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-semibold text-ink-900">
                    No clips submitted yet
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-ink-500">
                    Publish a clip that follows the guidelines, then submit its
                    link here.
                  </p>
                  {canSubmit ? (
                    <Button asChild className="mt-4">
                      <Link
                        href={`/dashboard/submissions/new?campaign=${campaign.id}`}
                      >
                        Submit your first clip
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ul className="divide-y divide-border-soft">
                  {submissions.map((submission) => {
                    const metrics = metricsOf(submission);
                    const prov = provenance(metrics);
                    const viewCount = metrics
                      ? Number(metrics.view_count) || 0
                      : 0;
                    const reward = isVerified(metrics)
                      ? computeReward({
                          eligibleViews: viewCount,
                          rewardPer1000Views: rate,
                          maxRewardPerSubmission:
                            campaign.max_reward_per_submission,
                          minEligibleViews: campaign.min_views,
                          remainingCampaignBudget: Number(
                            campaign.remaining_budget
                          ),
                          platformFeePercent: PLATFORM_FEE_PERCENT,
                        })
                      : null;
                    return (
                      <li key={submission.id} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <a
                              href={submission.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-900 hover:underline"
                            >
                              {platformLabel(submission.platform)}
                              <ExternalLink
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                            </a>
                            <p className="mt-0.5 text-xs text-ink-400">
                              Submitted {formatDate(submission.submitted_at)}
                            </p>
                          </div>
                          <SubmissionStatusBadge status={submission.status} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant={prov.tone}>{prov.label}</Badge>
                          {metrics ? (
                            <span className="text-ink-500">
                              {formatNumber(Number(metrics.view_count))} views
                            </span>
                          ) : null}
                          {reward ? (
                            <span className="font-medium text-brand-700">
                              ~{formatINR(reward.net)}
                            </span>
                          ) : null}
                        </div>

                        {submission.status === "rejected" &&
                        submission.rejection_reason ? (
                          <p className="mt-3 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/40 p-3 text-xs text-ink-600">
                            <TriangleExclamationPoint
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger"
                              aria-hidden="true"
                            />
                            {submission.rejection_reason}
                          </p>
                        ) : null}

                        <div className="mt-2">
                          <Link
                            href={`/dashboard/submissions/${submission.id}`}
                            className="text-xs font-medium text-ink-500 hover:text-ink-900"
                          >
                            View details
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Campaign instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-ink-600">
              {campaign.objective ? (
                <div>
                  <p className="text-xs font-medium text-ink-600">Objective</p>
                  <p className="mt-1">{campaign.objective}</p>
                </div>
              ) : null}

              <dl className="divide-y divide-border-soft">
                <InfoRow
                  label="Caption requirements"
                  value={rules?.caption_requirements}
                />
                <InfoRow
                  label="Mandatory branding"
                  value={rules?.mandatory_branding}
                />
                <InfoRow
                  label="Content restrictions"
                  value={rules?.content_restrictions}
                />
                <InfoRow
                  label="Prohibited content"
                  value={rules?.prohibited_content}
                />
              </dl>

              {rules?.required_hashtags?.length ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                    <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                    Required hashtags
                  </p>
                  <RulePills items={rules.required_hashtags} icon={Hash} />
                </div>
              ) : null}

              {rules?.required_mentions?.length ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                    <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                    Required mentions
                  </p>
                  <RulePills items={rules.required_mentions} icon={AtSign} />
                </div>
              ) : null}

              {rules?.disclosure_required ? (
                <p className="rounded-xl border border-info/20 bg-info-soft/40 p-3 text-xs text-ink-600">
                  A paid-promotion disclosure is required on every post.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <p className="text-sm text-ink-400">
                  No downloadable materials were provided.
                </p>
              ) : (
                <ul className="space-y-2">
                  {assets.map((asset) => {
                    const meta = ASSET_META[asset.type] ?? {
                      label: asset.type,
                      icon: FileText,
                    };
                    const AssetIcon = meta.icon;
                    return (
                      <li
                        key={asset.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border-soft bg-surface-soft p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <AssetIcon
                            className="h-4 w-4 shrink-0 text-ink-500"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-900">
                              {asset.filename ?? meta.label}
                            </p>
                            <p className="text-xs text-ink-400">{meta.label}</p>
                          </div>
                        </div>
                        {asset.url ? (
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-700 hover:underline"
                          >
                            <Download className="h-3 w-3" aria-hidden="true" />
                            Get
                          </a>
                        ) : (
                          <span className="text-xs text-ink-400">
                            Unavailable
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Reward rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border-soft">
                <InfoRow label="Reward rate" value={rewardFormula(rate)} />
                <InfoRow
                  label="Minimum verified views"
                  value={`${formatNumber(Number(campaign.min_views))} views`}
                />
                <InfoRow
                  label="Max payout per clip"
                  value={
                    campaign.max_reward_per_submission != null
                      ? formatINR(Number(campaign.max_reward_per_submission))
                      : "No per-clip cap"
                  }
                />
                <InfoRow
                  label="Remaining budget"
                  value={formatINR(Number(campaign.remaining_budget))}
                />
                <InfoRow
                  label="Deadline"
                  value={
                    campaign.submission_deadline
                      ? formatDate(campaign.submission_deadline)
                      : "Open-ended"
                  }
                />
              </dl>
              <Separator className="my-4" />
              <p className="text-xs leading-relaxed text-ink-500">
                Only API-verified views count toward your reward. Manual or
                unverified numbers are shown for context but never paid.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-ink-400" aria-hidden="true" />
                Campaign activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-ink-400">
                  No updates on this campaign yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((note) => (
                    <li key={note.id} className="flex items-start gap-2.5">
                      <CircleCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">
                          {note.title ?? "Update"}
                        </p>
                        {note.body ? (
                          <p className="text-xs text-ink-500">{note.body}</p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-ink-400">
                          {timeAgo(note.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning-soft/40">
            <CardContent className="flex items-start gap-2.5 p-4">
              <CalendarClock
                className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-ink-600">
                {campaign.submission_deadline
                  ? `Submit before ${formatDate(campaign.submission_deadline)}. `
                  : ""}
                Submitting a link does not verify views or guarantee payment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Workspace params={params} />
    </Suspense>
  );
}
