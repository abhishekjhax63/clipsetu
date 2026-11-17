import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Ban,
  Calendar,
  CircleCheckBig,
  Copy,
  Download,
  ExternalLink,
  Info,
  Layers,
  Package,
  Pause,
  Play,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  CAMPAIGN_TYPE_LABEL,
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_TONE,
  formatRupees,
} from "@/lib/campaigns";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  cancelCampaign,
  duplicateCampaign,
  endCampaign,
  pauseCampaign,
  resumeCampaign,
} from "../actions";

export const metadata: Metadata = {
  title: "Campaign detail",
  robots: { index: false, follow: false },
};

interface CampaignDetailRow {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  category: string | null;
  type: string;
  objective: string | null;
  status: string;
  budget: number;
  remaining_budget: number;
  funded_amount: number;
  reward_per_1k_views: number;
  max_reward_per_submission: number | null;
  max_campaign_reward: number | null;
  min_views: number;
  max_submissions_per_creator: number | null;
  max_total_submissions: number | null;
  thumbnail_url: string | null;
  start_date: string | null;
  end_date: string | null;
  submission_deadline: string | null;
  rejection_reason: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RulesRow {
  platforms: string[] | null;
  required_hashtags: string[] | null;
  required_mentions: string[] | null;
  caption_requirements: string | null;
  min_duration_seconds: number | null;
  max_duration_seconds: number | null;
  content_restrictions: string | null;
  mandatory_branding: string | null;
  prohibited_content: string | null;
  language: string | null;
  disclosure_required: boolean;
  eligible_categories: string[] | null;
  min_followers: number | null;
  geographic_restrictions: string[] | null;
  age_requirement: number;
}

interface AssetRow {
  id: string;
  type: string;
  url: string | null;
  filename: string | null;
  size_bytes: number | null;
}

interface TxnRow {
  id: string;
  type: string;
  direction: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={CAMPAIGN_STATUS_TONE[status] ?? "secondary"}>
      {CAMPAIGN_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-500">{label}</span>
          <Icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
        </div>
        <p className="mt-3 text-xl font-bold tracking-tight text-ink-900">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-sm font-medium text-ink-900 sm:text-right">{value}</dd>
    </div>
  );
}

function ActionForm({
  action,
  campaignId,
  label,
  icon: Icon,
  variant = "secondary",
}: {
  action: (formData: FormData) => Promise<void>;
  campaignId: string;
  label: string;
  icon: LucideIcon;
  variant?: "secondary" | "danger" | "outline";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <Button type="submit" variant={variant} size="sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    </form>
  );
}

async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("brand");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Campaign details need a backend">
        This page reads live campaign data from Supabase. Configure your project
        and apply the migrations to view real data.
      </SetupNotice>
    );
  }

  const supabase = await createClient();

  const { data: campaignData } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const campaign = campaignData as CampaignDetailRow | null;
  if (!campaign || campaign.brand_id !== user.id) notFound();

  const [rulesRes, assetsRes, txnsRes, subsRes] = await Promise.all([
    supabase.from("campaign_rules").select("*").eq("campaign_id", id).maybeSingle(),
    supabase
      .from("campaign_assets")
      .select("id, type, url, filename, size_bytes")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("wallet_transactions")
      .select("id, type, direction, amount, status, description, created_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("submissions").select("id, status").eq("campaign_id", id),
  ]);

  const rules = rulesRes.data as RulesRow | null;
  const assets = (assetsRes.data ?? []) as AssetRow[];
  const txns = (txnsRes.data ?? []) as TxnRow[];
  const submissions = (subsRes.data ?? []) as { id: string; status: string }[];

  const spent = Math.max(
    0,
    Number(campaign.funded_amount ?? 0) - Number(campaign.remaining_budget ?? 0)
  );

  const submissionCounts = submissions.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const status = campaign.status;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to campaigns
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                {campaign.title}
              </h1>
              <StatusBadge status={status} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
              <Badge variant="outline">
                {CAMPAIGN_TYPE_LABEL[campaign.type] ?? campaign.type}
              </Badge>
              {campaign.category ? (
                <Badge variant="outline">{campaign.category}</Badge>
              ) : null}
              <span className="text-xs text-ink-400">
                Created {formatDate(campaign.created_at)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/dashboard/campaigns/${campaign.id}/submissions`}>
                <Users className="h-4 w-4" aria-hidden="true" />
                Review submissions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/dashboard/campaigns/${campaign.id}/report`} download>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download report
              </a>
            </Button>
            <ActionForm
              action={duplicateCampaign}
              campaignId={campaign.id}
              label="Duplicate"
              icon={Copy}
              variant="outline"
            />
          </div>
        </div>
      </div>

      {(campaign.rejection_reason || campaign.review_notes) && (
        <Card className="border-warning-soft bg-warning-soft/30">
          <CardContent className="space-y-2 p-5 text-sm">
            {campaign.rejection_reason ? (
              <p className="text-ink-700">
                <span className="font-semibold text-ink-900">
                  Rejection reason:{" "}
                </span>
                {campaign.rejection_reason}
              </p>
            ) : null}
            {campaign.review_notes ? (
              <p className="text-ink-700">
                <span className="font-semibold text-ink-900">Review notes: </span>
                {campaign.review_notes}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Status controls */}
      <Card>
        <CardHeader>
          <CardTitle>Status controls</CardTitle>
          <CardDescription>
            Manage this campaign&apos;s lifecycle. Transitions are enforced
            server-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {status === "active" ? (
            <ActionForm
              action={pauseCampaign}
              campaignId={campaign.id}
              label="Pause"
              icon={Pause}
            />
          ) : null}
          {status === "paused" ? (
            <ActionForm
              action={resumeCampaign}
              campaignId={campaign.id}
              label="Resume"
              icon={Play}
            />
          ) : null}
          {status === "active" || status === "paused" ? (
            <ActionForm
              action={endCampaign}
              campaignId={campaign.id}
              label="End campaign"
              icon={CircleCheckBig}
              variant="outline"
            />
          ) : null}
          {["draft", "pending_payment", "pending_review", "scheduled", "active", "paused"].includes(
            status
          ) ? (
            <ActionForm
              action={cancelCampaign}
              campaignId={campaign.id}
              label="Cancel"
              icon={Ban}
              variant="danger"
            />
          ) : null}
          {!["active", "paused", "draft", "pending_payment", "pending_review", "scheduled"].includes(
            status
          ) ? (
            <p className="text-sm text-ink-500">
              No status changes are available for a {CAMPAIGN_STATUS_LABEL[status] ?? status} campaign.
              You can duplicate it to start again.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Money */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Budget" value={formatRupees(campaign.budget)} />
        <StatCard
          icon={TrendingUp}
          label="Funded"
          value={formatRupees(campaign.funded_amount)}
        />
        <StatCard
          icon={Wallet}
          label="Remaining"
          value={formatRupees(campaign.remaining_budget)}
          hint="Available to pay rewards"
        />
        <StatCard
          icon={TrendingUp}
          label="Spent (paid out)"
          value={formatRupees(spent)}
          hint="Funded minus remaining"
        />
      </div>

      {status === "pending_payment" ? (
        <Card className="border-warning/30 bg-warning-soft/40">
          <CardContent className="flex items-start gap-2 p-5 text-sm text-ink-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              This campaign is pending payment. It can only go live once its budget
              has been funded. Funding is processed through the payments flow.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Brief */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign brief</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {campaign.description}
            </p>
          ) : (
            <p className="text-sm text-ink-400">No description provided.</p>
          )}
          <dl className="divide-y divide-border-soft">
            <DetailRow label="Objective" value={campaign.objective} />
            <DetailRow
              label="Reward"
              value={`${formatRupees(campaign.reward_per_1k_views)} per 1,000 views`}
            />
            <DetailRow
              label="Max reward per submission"
              value={
                campaign.max_reward_per_submission != null
                  ? formatRupees(campaign.max_reward_per_submission)
                  : null
              }
            />
            <DetailRow
              label="Max campaign reward"
              value={
                campaign.max_campaign_reward != null
                  ? formatRupees(campaign.max_campaign_reward)
                  : null
              }
            />
            <DetailRow
              label="Minimum views"
              value={formatNumber(Number(campaign.min_views ?? 0))}
            />
            <DetailRow
              label="Max submissions per creator"
              value={campaign.max_submissions_per_creator ?? null}
            />
            <DetailRow
              label="Max total submissions"
              value={campaign.max_total_submissions ?? null}
            />
            <DetailRow
              label="Thumbnail"
              value={
                campaign.thumbnail_url ? (
                  <a
                    href={campaign.thumbnail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ink-900 underline-offset-4 hover:underline"
                  >
                    View image
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : null
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-ink-400" aria-hidden="true" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border-soft">
            <DetailRow
              label="Start date"
              value={campaign.start_date ? formatDate(campaign.start_date) : null}
            />
            <DetailRow
              label="End date"
              value={campaign.end_date ? formatDate(campaign.end_date) : null}
            />
            <DetailRow
              label="Submission deadline"
              value={
                campaign.submission_deadline
                  ? formatDate(campaign.submission_deadline)
                  : null
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-ink-400" aria-hidden="true" />
            Content rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rules ? (
            <dl className="divide-y divide-border-soft">
              <DetailRow
                label="Platforms"
                value={
                  rules.platforms && rules.platforms.length > 0 ? (
                    <span className="flex flex-wrap justify-end gap-1">
                      {rules.platforms.map((p) => (
                        <Badge key={p} variant="outline" className="capitalize">
                          {p}
                        </Badge>
                      ))}
                    </span>
                  ) : null
                }
              />
              <DetailRow
                label="Required hashtags"
                value={rules.required_hashtags?.join(" ")}
              />
              <DetailRow
                label="Required mentions"
                value={rules.required_mentions?.join(" ")}
              />
              <DetailRow
                label="Caption requirements"
                value={rules.caption_requirements}
              />
              <DetailRow
                label="Min duration"
                value={
                  rules.min_duration_seconds != null
                    ? `${rules.min_duration_seconds}s`
                    : null
                }
              />
              <DetailRow
                label="Max duration"
                value={
                  rules.max_duration_seconds != null
                    ? `${rules.max_duration_seconds}s`
                    : null
                }
              />
              <DetailRow
                label="Content restrictions"
                value={rules.content_restrictions}
              />
              <DetailRow label="Mandatory branding" value={rules.mandatory_branding} />
              <DetailRow label="Prohibited content" value={rules.prohibited_content} />
              <DetailRow label="Language" value={rules.language} />
              <DetailRow
                label="Disclosure required"
                value={rules.disclosure_required ? "Yes" : "No"}
              />
              <DetailRow
                label="Eligible categories"
                value={rules.eligible_categories?.join(", ")}
              />
              <DetailRow
                label="Minimum followers"
                value={
                  rules.min_followers != null
                    ? formatNumber(rules.min_followers)
                    : null
                }
              />
              <DetailRow
                label="Geographic restrictions"
                value={rules.geographic_restrictions?.join(", ")}
              />
              <DetailRow label="Age requirement" value={`${rules.age_requirement}+`} />
            </dl>
          ) : (
            <p className="text-sm text-ink-400">No content rules recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-ink-400" aria-hidden="true" />
            Source materials
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-ink-400">No assets attached.</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {asset.type}
                    </Badge>
                    <span className="truncate text-sm text-ink-700">
                      {asset.filename ?? asset.url ?? "Asset"}
                    </span>
                  </div>
                  {asset.url ? (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink-900 underline-offset-4 hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Spend history */}
      <Card>
        <CardHeader>
          <CardTitle>Spend history</CardTitle>
          <CardDescription>
            Ledger entries recorded against this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {txns.length === 0 ? (
            <p className="text-sm text-ink-400">
              No funding or rewards recorded yet.
            </p>
          ) : (
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Description</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {txns.map((t) => (
                    <tr key={t.id}>
                      <td className="py-3 pr-4 capitalize text-ink-700">
                        {t.type.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 pr-4 text-ink-500">
                        {t.description ?? "—"}
                      </td>
                      <td className="py-3 pr-4 capitalize text-ink-500">{t.status}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-ink-900">
                        {formatRupees(t.amount)}
                      </td>
                      <td className="py-3 text-ink-500">{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions summary */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-ink-400" aria-hidden="true" />
              Submissions
            </CardTitle>
            <CardDescription>
              {formatNumber(submissions.length)} submission
              {submissions.length === 1 ? "" : "s"} received
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={`/dashboard/campaigns/${campaign.id}/submissions`}>
              Review
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-sm text-ink-400">No submissions yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(submissionCounts).map(([key, count]) => (
                <Badge key={key} variant={SUBMISSION_STATUS_TONE[key] ?? "secondary"}>
                  {SUBMISSION_STATUS_LABEL[key] ?? key}: {formatNumber(count)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CampaignDetail params={params} />
    </Suspense>
  );
}
