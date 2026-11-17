import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Compass,
  Eye,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { CampaignFilters } from "@/components/clipper/campaign-filters";
import { JoinCampaignButton } from "@/components/clipper/join-campaign-button";
import { CampaignStatusBadge } from "@/components/clipper/status-badges";
import { getBrandDirectory } from "@/components/clipper/brand-directory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CAMPAIGN_TYPE_LABEL, formatRupees } from "@/lib/campaigns";
import { rewardFormula } from "@/lib/rewards";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";
import { platformLabel } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Discover campaigns",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

interface DiscoverRule {
  platforms: string[] | null;
  language: string | null;
  eligible_categories: string[] | null;
  min_followers: number | null;
  age_requirement: number | null;
  required_hashtags: string[] | null;
  required_mentions: string[] | null;
}

interface DiscoverCampaign {
  id: string;
  title: string;
  category: string | null;
  type: string;
  status: string;
  budget: number;
  remaining_budget: number;
  reward_per_1k_views: number;
  max_reward_per_submission: number | null;
  max_campaign_reward: number | null;
  min_views: number;
  thumbnail_url: string | null;
  submission_deadline: string | null;
  brand_id: string;
  campaign_rules: DiscoverRule | DiscoverRule[] | null;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

function ruleOf(row: DiscoverCampaign): DiscoverRule | null {
  const rules = row.campaign_rules;
  if (Array.isArray(rules)) return rules[0] ?? null;
  return rules;
}

function BrandMark({
  name,
  logoUrl,
}: {
  name: string | null;
  logoUrl: string | null;
}) {
  const label = name ?? "Brand account";
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-9 w-9 rounded-lg">
        {logoUrl ? (
          <AvatarImage src={logoUrl} alt={label} className="rounded-lg" />
        ) : null}
        <AvatarFallback className="rounded-lg text-xs">
          {label.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm text-ink-500">{label}</span>
    </div>
  );
}

function EligibilityList({ rule }: { rule: DiscoverRule | null }) {
  const items: string[] = [];
  if (rule?.eligible_categories && rule.eligible_categories.length > 0) {
    items.push(`Categories: ${rule.eligible_categories.join(", ")}`);
  }
  if (rule?.min_followers != null) {
    items.push(`Min. ${formatNumber(rule.min_followers)} followers`);
  }
  if (rule?.age_requirement != null) {
    items.push(`${rule.age_requirement}+ years old`);
  }
  if (rule?.language) items.push(`Language: ${rule.language}`);

  if (items.length === 0) {
    return (
      <p className="text-xs text-ink-400">
        Open to all eligible creators on ClipSetu.
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-xs text-ink-500">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-1.5">
          <ShieldCheck
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600"
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

function CampaignCard({
  campaign,
  brandName,
  brandLogo,
}: {
  campaign: DiscoverCampaign;
  brandName: string | null;
  brandLogo: string | null;
}) {
  const rule = ruleOf(campaign);
  const platforms = rule?.platforms ?? [];
  const maxReward =
    campaign.max_reward_per_submission ?? campaign.max_campaign_reward ?? null;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <BrandMark name={brandName} logoUrl={brandLogo} />
          <CampaignStatusBadge status={campaign.status} />
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug text-ink-900">
          <Link
            href={`/campaigns/${campaign.id}`}
            className="hover:underline underline-offset-4"
          >
            {campaign.title}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap gap-1.5">
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

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ink-400">Reward rate</dt>
            <dd className="font-semibold text-ink-900">
              {rewardFormula(Number(campaign.reward_per_1k_views))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Max payout / clip</dt>
            <dd className="font-semibold text-ink-900">
              {maxReward != null ? formatRupees(maxReward) : "Uncapped"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Remaining budget</dt>
            <dd className="font-semibold text-brand-700">
              {formatINR(Number(campaign.remaining_budget))}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs text-ink-400">
              <Eye className="h-3 w-3" aria-hidden="true" /> Min. views
            </dt>
            <dd className="font-semibold text-ink-900">
              {formatNumber(Number(campaign.min_views))}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-ink-500">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {campaign.submission_deadline
            ? `Submit by ${formatDate(campaign.submission_deadline)}`
            : "Open until budget is exhausted"}
        </div>

        <div className="mt-4 rounded-xl border border-border-soft bg-surface-soft p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Eligibility
          </p>
          <div className="mt-2">
            <EligibilityList rule={rule} />
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-5">
          <JoinCampaignButton
            campaignId={campaign.id}
            size="sm"
            className="flex-1"
          />
          <Button asChild variant="secondary" size="sm">
            <Link href={`/campaigns/${campaign.id}`}>
              Details
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-96 w-full rounded-2xl" />
      ))}
    </div>
  );
}

async function DiscoverResults({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Campaign discovery needs a backend">
        Discovery reads live campaigns from Supabase. Add your project
        credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to browse real campaigns — nothing here is faked.
      </SetupNotice>
    );
  }

  await requireRole("clipper");

  const params = await searchParams;
  const q = first(params.q);
  const category = first(params.category);
  const platform = first(params.platform);
  const minReward = first(params.minReward);
  const minViews = first(params.minViews);
  const language = first(params.language);
  const statusParam = first(params.status);
  const statusFilter =
    statusParam === "active" || statusParam === "scheduled"
      ? statusParam
      : null;

  const supabase = await createClient();

  let query = supabase
    .from("campaigns")
    .select(
      "id, title, category, type, status, budget, remaining_budget, reward_per_1k_views, max_reward_per_submission, max_campaign_reward, min_views, thumbnail_url, submission_deadline, brand_id, campaign_rules!inner(platforms, language, eligible_categories, min_followers, age_requirement, required_hashtags, required_mentions)"
    )
    .in("status", statusFilter ? [statusFilter] : ["active", "scheduled"]);

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);
  if (platform) query = query.contains("campaign_rules.platforms", [platform]);
  if (language)
    query = query.ilike("campaign_rules.language", `%${language}%`);

  const minRewardNumber = Number(minReward);
  if (minReward && Number.isFinite(minRewardNumber)) {
    query = query.gte("reward_per_1k_views", minRewardNumber);
  }
  const minViewsNumber = Number(minViews);
  if (minViews && Number.isFinite(minViewsNumber)) {
    query = query.lte("min_views", minViewsNumber);
  }

  query = query
    .or(`submission_deadline.is.null,submission_deadline.gte.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(60);

  const { data, error } = (await query) as {
    data: DiscoverCampaign[] | null;
    error: { message: string } | null;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="font-semibold text-ink-900">
            We couldn&apos;t load campaigns
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Please try again in a moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const campaigns = data ?? [];

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <Compass className="h-7 w-7 text-ink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink-900">No campaigns match</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Try widening your filters, or check back soon — new campaigns go live
          regularly.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/dashboard/discover">Clear filters</Link>
        </Button>
      </div>
    );
  }

  const brands = await getBrandDirectory(campaigns.map((c) => c.brand_id));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {campaigns.map((campaign) => {
        const brand = brands.get(campaign.brand_id);
        return (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            brandName={brand?.brandName ?? null}
            brandLogo={brand?.logoUrl ?? null}
          />
        );
      })}
    </div>
  );
}

export default function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Discover campaigns
        </h1>
        <p className="text-sm text-ink-500">
          Find open campaigns, join them, and get paid for verified views on your
          clips.
        </p>
      </header>

      <Suspense
        fallback={<Skeleton className="h-44 w-full rounded-2xl" />}
      >
        <CampaignFilters />
      </Suspense>

      <Suspense fallback={<DiscoverSkeleton />}>
        <DiscoverResults searchParams={searchParams} />
      </Suspense>

      <Card className="border-brand-100 bg-brand-50">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink-900">
                Rewards come from verified views only
              </p>
              <p className="mt-1 text-sm text-ink-600">
                A submitted link is not proof of views. Earnings are calculated
                from API-verified metrics and paid once you are KYC-complete.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href="/dashboard/submissions">My submissions</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
