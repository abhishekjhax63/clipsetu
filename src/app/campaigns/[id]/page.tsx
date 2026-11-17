import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  AtSign,
  CalendarClock,
  Clapperboard,
  ExternalLink,
  FileText,
  Hash,
  Image as ImageIcon,
  Link2,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { getCurrentUser } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { JoinCampaignButton } from "@/components/clipper/join-campaign-button";
import { CampaignStatusBadge } from "@/components/clipper/status-badges";
import { getBrandDirectory } from "@/components/clipper/brand-directory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CAMPAIGN_TYPE_LABEL,
  formatRupees,
} from "@/lib/campaigns";
import { computeReward, rewardFormula } from "@/lib/rewards";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";
import { platformLabel } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Campaign details",
  robots: { index: false, follow: false },
};

interface CampaignRow {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  category: string | null;
  type: string;
  objective: string | null;
  status: string;
  remaining_budget: number;
  reward_per_1k_views: number;
  max_reward_per_submission: number | null;
  max_campaign_reward: number | null;
  min_views: number;
  submission_deadline: string | null;
  thumbnail_url: string | null;
}

interface RulesRow {
  platforms: string[] | null;
  required_hashtags: string[] | null;
  required_mentions: string[] | null;
  caption_requirements: string | null;
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

const ASSET_META: Record<string, { label: string; icon: LucideIcon }> = {
  video: { label: "Source video", icon: Clapperboard },
  image: { label: "Image", icon: ImageIcon },
  logo: { label: "Brand logo", icon: Sparkles },
  document: { label: "Document", icon: FileText },
  reference: { label: "Reference link", icon: Link2 },
};

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-ink-600">
        {children}
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

function RulePills({
  items,
  icon: Icon,
}: {
  items: string[];
  icon: LucideIcon;
}) {
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

function StockImage() {
  return (
    <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface-soft text-ink-300 sm:h-52">
      <Clapperboard className="h-8 w-8" aria-hidden="true" />
    </div>
  );
}

async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <SetupNotice title="Campaign details need a backend">
          This page reads live campaign data from Supabase. Configure your
          project and apply the migrations in{" "}
          <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
            supabase/migrations
          </code>{" "}
          to view real campaign details — nothing here is faked.
        </SetupNotice>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: campaignData } = await supabase
    .from("campaigns")
    .select(
      "id, brand_id, title, description, category, type, objective, status, remaining_budget, reward_per_1k_views, max_reward_per_submission, max_campaign_reward, min_views, submission_deadline, thumbnail_url"
    )
    .eq("id", id)
    .maybeSingle();

  const campaign = campaignData as CampaignRow | null;
  if (!campaign) notFound();

  const [rulesRes, assetsRes, user] = await Promise.all([
    supabase
      .from("campaign_rules")
      .select(
        "platforms, required_hashtags, required_mentions, caption_requirements, content_restrictions, mandatory_branding, prohibited_content, language, disclosure_required, eligible_categories, min_followers, geographic_restrictions, age_requirement"
      )
      .eq("campaign_id", id)
      .maybeSingle(),
    supabase
      .from("campaign_assets")
      .select("id, type, url, filename, size_bytes")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true }),
    getCurrentUser(),
  ]);

  const rules = (rulesRes.data ?? null) as RulesRow | null;
  const assets = (assetsRes.data ?? []) as AssetRow[];
  const brands = await getBrandDirectory([campaign.brand_id]);
  const brand = brands.get(campaign.brand_id) ?? null;

  let joined = false;
  if (user && user.role === "clipper") {
    const { data: membership } = await supabase
      .from("campaign_memberships")
      .select("id")
      .eq("campaign_id", id)
      .eq("creator_id", user.id)
      .eq("status", "joined")
      .maybeSingle();
    joined = Boolean(membership);
  }

  const rate = Number(campaign.reward_per_1k_views);
  const deadlinePassed =
    campaign.submission_deadline != null &&
    new Date(campaign.submission_deadline).getTime() < new Date().getTime();
  const openForJoining =
    (campaign.status === "active" || campaign.status === "scheduled") &&
    !deadlinePassed;

  // Illustrative reward at the campaign's minimum view threshold. This is a
  // calculation from the campaign's own rate — never a promise of earnings.
  const sampleViews = Math.max(Number(campaign.min_views), 1000);
  const example = computeReward({
    eligibleViews: sampleViews,
    rewardPer1000Views: rate,
    maxRewardPerSubmission: campaign.max_reward_per_submission,
    minEligibleViews: campaign.min_views,
    remainingCampaignBudget: Number(campaign.remaining_budget),
    platformFeePercent: PLATFORM_FEE_PERCENT,
  });

  const platforms = rules?.platforms ?? [];
  const brandLabel = brand?.brandName ?? "Brand account";
  const maxPerClip = campaign.max_reward_per_submission;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to marketplace
        </Link>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Main column */}
          <div className="space-y-8">
            <header>
              {campaign.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={campaign.thumbnail_url}
                  alt=""
                  className="mb-5 h-40 w-full rounded-2xl border border-border-soft object-cover sm:h-52"
                />
              ) : (
                <div className="mb-5">
                  <StockImage />
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 rounded-xl">
                    {brand?.logoUrl ? (
                      <AvatarImage
                        src={brand.logoUrl}
                        alt={brandLabel}
                        className="rounded-xl"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-xl text-sm">
                      {brandLabel.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-500">{brandLabel}</p>
                    {brand?.businessCategory ? (
                      <p className="text-xs text-ink-400">
                        {brand.businessCategory}
                      </p>
                    ) : null}
                  </div>
                </div>
                <CampaignStatusBadge status={campaign.status} />
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                {campaign.title}
              </h1>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  {CAMPAIGN_TYPE_LABEL[campaign.type] ?? campaign.type}
                </Badge>
                {campaign.category ? (
                  <Badge variant="outline">{campaign.category}</Badge>
                ) : null}
                {platforms.length > 0 ? (
                  platforms.map((platform) => (
                    <Badge key={platform} variant="outline">
                      {platformLabel(platform)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Any platform</Badge>
                )}
              </div>
            </header>

            {campaign.objective ? (
              <Section title="Objective" icon={Target}>
                {campaign.objective}
              </Section>
            ) : null}

            {campaign.description ? (
              <Section title="About this campaign" icon={FileText}>
                <p className="whitespace-pre-line">{campaign.description}</p>
              </Section>
            ) : null}

            <Section title="Source materials" icon={Clapperboard}>
              {assets.length === 0 ? (
                <p className="text-ink-400">
                  No downloadable materials have been attached to this campaign.
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
                            Open
                            <ExternalLink
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          <span className="text-xs text-ink-400">
                            Not available
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title="Creative guidelines" icon={ShieldCheck}>
              <dl className="divide-y divide-border-soft">
                <DetailRow
                  label="Caption requirements"
                  value={rules?.caption_requirements}
                />
                <DetailRow
                  label="Mandatory branding"
                  value={rules?.mandatory_branding}
                />
                <DetailRow
                  label="Content restrictions"
                  value={rules?.content_restrictions}
                />
                <DetailRow
                  label="Prohibited content"
                  value={rules?.prohibited_content}
                />
              </dl>

              {rules?.required_hashtags?.length ? (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                    <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                    Required hashtags
                  </p>
                  <RulePills items={rules.required_hashtags} icon={Hash} />
                </div>
              ) : null}

              {rules?.required_mentions?.length ? (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                    <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                    Required mentions
                  </p>
                  <RulePills items={rules.required_mentions} icon={AtSign} />
                </div>
              ) : null}

              {rules && !rules.caption_requirements &&
              !rules.mandatory_branding &&
              !rules.content_restrictions &&
              !rules.prohibited_content &&
              !rules.required_hashtags?.length &&
              !rules.required_mentions?.length ? (
                <p className="text-ink-400">
                  No specific creative guidelines were provided.
                </p>
              ) : null}
            </Section>

            <Section title="Reward calculation" icon={Wallet}>
              <dl className="divide-y divide-border-soft">
                <DetailRow
                  label="Reward rate"
                  value={rewardFormula(rate)}
                />
                <DetailRow
                  label="Minimum verified views"
                  value={`${formatNumber(Number(campaign.min_views))} views`}
                />
                <DetailRow
                  label="Max payout per clip"
                  value={
                    maxPerClip != null
                      ? formatRupees(maxPerClip)
                      : "No per-clip cap"
                  }
                />
                <DetailRow
                  label="Campaign reward ceiling"
                  value={
                    campaign.max_campaign_reward != null
                      ? formatRupees(campaign.max_campaign_reward)
                      : "Not specified"
                  }
                />
              </dl>

              <div className="mt-4 rounded-xl border border-border-soft bg-surface-soft p-4">
                <p className="text-xs font-medium text-ink-600">
                  Illustrative example
                </p>
                <p className="mt-1 text-sm text-ink-600">
                  At{" "}
                  <span className="font-medium text-ink-900">
                    {formatNumber(sampleViews)}
                  </span>{" "}
                  verified views you would receive about{" "}
                  <span className="font-semibold text-mint-700">
                    {formatINR(example.net)}
                  </span>{" "}
                  after the {PLATFORM_FEE_PERCENT}% platform fee
                  {example.cappedBy === "submission_cap"
                    ? " (limited by the per-clip cap)"
                    : ""}
                  .
                </p>
                <p className="mt-2 text-xs text-ink-400">
                  This is a calculation from the campaign&apos;s own rate, not a
                  promise. Payouts are based only on API-verified view counts.
                </p>
              </div>
            </Section>

            <Section title="Eligibility" icon={Users}>
              <dl className="divide-y divide-border-soft">
                <DetailRow
                  label="Minimum followers"
                  value={
                    rules?.min_followers != null
                      ? formatNumber(rules.min_followers)
                      : null
                  }
                />
                <DetailRow
                  label="Minimum age"
                  value={
                    rules?.age_requirement != null
                      ? `${rules.age_requirement}+ years`
                      : null
                  }
                />
                <DetailRow
                  label="Content language"
                  value={rules?.language}
                />
                <DetailRow
                  label="Geographic restrictions"
                  value={
                    rules?.geographic_restrictions?.length
                      ? rules.geographic_restrictions.join(", ")
                      : null
                  }
                />
                <DetailRow
                  label="Eligible categories"
                  value={
                    rules?.eligible_categories?.length
                      ? rules.eligible_categories.join(", ")
                      : "Open to all creator categories"
                  }
                />
                <DetailRow
                  label="Paid promotion disclosure"
                  value={rules?.disclosure_required ? "Required" : "Not required"}
                />
              </dl>
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-mint-200 bg-gradient-earn-soft">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-ink-500">Reward rate</p>
                    <p className="text-sm font-semibold text-ink-900">
                      {rewardFormula(rate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Max / clip</p>
                    <p className="text-sm font-semibold text-ink-900">
                      {maxPerClip != null ? formatRupees(maxPerClip) : "Uncapped"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Min. views</p>
                    <p className="text-sm font-semibold text-ink-900">
                      {formatNumber(Number(campaign.min_views))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Remaining budget</p>
                    <p className="text-sm font-semibold text-mint-700">
                      {formatINR(Number(campaign.remaining_budget))}
                    </p>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="flex items-center gap-1.5 text-sm text-ink-600">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  {campaign.submission_deadline
                    ? `Submit by ${formatDate(campaign.submission_deadline)}`
                    : "Open until the budget is exhausted"}
                </div>

                <div className="mt-5">
                  {!user ? (
                    <Button asChild className="w-full">
                      <Link href={`/login?next=/campaigns/${campaign.id}`}>
                        Log in to join
                      </Link>
                    </Button>
                  ) : user.role !== "clipper" ? (
                    <div className="rounded-xl border border-border-soft bg-surface-soft p-3 text-xs text-ink-500">
                      Only creator (clipper) accounts can join campaigns. You are
                      signed in as a {user.role.replace("_", " ")} account.
                    </div>
                  ) : joined ? (
                    <Button asChild className="w-full">
                      <Link href={`/dashboard/workspace/${campaign.id}`}>
                        Open workspace
                      </Link>
                    </Button>
                  ) : openForJoining ? (
                    <JoinCampaignButton
                      campaignId={campaign.id}
                      className="w-full"
                      label="Join campaign"
                    />
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-border-soft bg-surface-soft p-3 text-xs text-ink-500">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      {deadlinePassed
                        ? "The submission deadline has passed."
                        : "This campaign is not open for joining."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-ink-500">
                <p>
                  Rewards are paid only for views verified through official
                  platform APIs — a submitted link is never treated as proof of
                  views.
                </p>
                <p>
                  You must comply with the creative guidelines, hashtags and
                  disclosure rules above. Non-compliant submissions may be
                  rejected.
                </p>
                <p>
                  Payouts require a complete creator profile and verified KYC.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-14 sm:px-6">
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-9 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PublicLayout>
      <Suspense fallback={<DetailSkeleton />}>
        <CampaignDetail params={params} />
      </Suspense>
    </PublicLayout>
  );
}
