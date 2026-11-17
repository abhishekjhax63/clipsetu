import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import {
  SubmitClipForm,
  type JoinedCampaignOption,
} from "@/components/clipper/submit-clip-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Submit a clip",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

interface RuleRel {
  platforms: string[] | null;
  required_hashtags: string[] | null;
  required_mentions: string[] | null;
}

interface CampaignRel {
  id: string;
  title: string;
  status: string;
  submission_deadline: string | null;
  max_submissions_per_creator: number | null;
  campaign_rules: RuleRel | RuleRel[] | null;
}

interface MembershipRel {
  campaign_id: string;
  campaigns: CampaignRel | CampaignRel[] | null;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function SubmitClipPanel({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Submitting clips needs a backend">
        Submissions are stored in Supabase. Add your project credentials and
        apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to submit clips.
      </SetupNotice>
    );
  }

  const user = await requireRole("clipper");
  const supabase = await createClient();

  const [membershipsRes, submissionsRes] = await Promise.all([
    supabase
      .from("campaign_memberships")
      .select(
        "campaign_id, campaigns(id, title, status, submission_deadline, max_submissions_per_creator, campaign_rules(platforms, required_hashtags, required_mentions))"
      )
      .eq("creator_id", user.id)
      .eq("status", "joined"),
    supabase
      .from("submissions")
      .select("campaign_id")
      .eq("creator_id", user.id),
  ]);

  const memberships = (membershipsRes.data ?? []) as MembershipRel[];
  const usedByCampaign = (submissionsRes.data ?? []).reduce<
    Record<string, number>
  >((acc, row) => {
    const key = (row as { campaign_id: string }).campaign_id;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const now = new Date().getTime();
  const options: JoinedCampaignOption[] = [];

  for (const membership of memberships) {
    const campaign = firstRelation(membership.campaigns);
    if (!campaign) continue;
    if (campaign.status !== "active" && campaign.status !== "scheduled") {
      continue;
    }
    if (
      campaign.submission_deadline &&
      new Date(campaign.submission_deadline).getTime() < now
    ) {
      continue;
    }

    const used = usedByCampaign[campaign.id] ?? 0;
    const remaining =
      campaign.max_submissions_per_creator != null
        ? Math.max(0, campaign.max_submissions_per_creator - used)
        : null;

    if (remaining != null && remaining <= 0) continue;

    const rules = firstRelation(campaign.campaign_rules);
    options.push({
      id: campaign.id,
      title: campaign.title,
      platforms: rules?.platforms ?? [],
      requiredHashtags: rules?.required_hashtags ?? [],
      requiredMentions: rules?.required_mentions ?? [],
      remaining,
    });
  }

  if (options.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <Compass className="h-7 w-7 text-ink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink-900">
          No campaigns ready for submission
        </p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Join an open campaign first, or you may have reached the submission
          limit on the campaigns you have joined.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/discover">
            <Compass className="h-4 w-4" aria-hidden="true" />
            Discover campaigns
          </Link>
        </Button>
      </div>
    );
  }

  const params = await searchParams;
  const initialCampaignId = firstParam(params.campaign);

  return (
    <SubmitClipForm campaigns={options} initialCampaignId={initialCampaignId} />
  );
}

function SubmitSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

export default function NewSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/dashboard/submissions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to my submissions
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Submit a clip
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Submit the link to a clip you have already published to a campaign you
          joined.
        </p>
      </header>

      <Card className="border-info/20 bg-info-soft/40">
        <CardContent className="p-4">
          <p className="text-xs leading-relaxed text-ink-600">
            A submitted link is not proof of views and does not guarantee
            payment. It is recorded as your entry for review; rewards are based
            only on API-verified metrics.
          </p>
        </CardContent>
      </Card>

      <Suspense fallback={<SubmitSkeleton />}>
        <SubmitClipPanel searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
