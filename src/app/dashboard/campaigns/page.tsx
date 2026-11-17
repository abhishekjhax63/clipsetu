import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CircleCheck,
  Clock,
  Compass,
  Eye,
  IndianRupee,
  Layers,
  Plus,
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
  formatRupees,
} from "@/lib/campaigns";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Campaigns",
  robots: { index: false, follow: false },
};

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  type: string;
  category: string | null;
  budget: number;
  remaining_budget: number;
  reward_per_1k_views: number;
  created_at: string;
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
        <p className="mt-3 text-2xl font-bold tracking-tight text-ink-900">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

async function CampaignsContent() {
  const user = await requireRole("brand");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Campaigns need a backend">
        Your campaigns read live data from Supabase. Add your project credentials
        and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        — nothing here is faked.
      </SetupNotice>
    );
  }

  const supabase = await createClient();

  const [campaignsRes, depositsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id, title, status, type, category, budget, remaining_budget, reward_per_1k_views, created_at"
      )
      .eq("brand_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("wallet_transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .eq("type", "deposit"),
  ]);

  const campaigns = (campaignsRes.data ?? []) as CampaignRow[];
  const totalSpend = (depositsRes.data ?? []).reduce(
    (sum: number, t: { amount: number }) => sum + Number(t.amount ?? 0),
    0
  );

  // Aggregate verified-view totals per campaign from submission metrics.
  const viewsByCampaign: Record<string, number> = {};
  if (campaigns.length > 0) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("campaign_id, submission_metrics(view_count)")
      .in(
        "campaign_id",
        campaigns.map((c) => c.id)
      );

    for (const s of (subs ?? []) as {
      campaign_id: string;
      submission_metrics:
        | { view_count: number | null }[]
        | { view_count: number | null }
        | null;
    }[]) {
      const metrics = Array.isArray(s.submission_metrics)
        ? s.submission_metrics
        : s.submission_metrics
          ? [s.submission_metrics]
          : [];
      const views = metrics.reduce((sum, m) => sum + Number(m.view_count ?? 0), 0);
      viewsByCampaign[s.campaign_id] =
        (viewsByCampaign[s.campaign_id] ?? 0) + views;
    }
  }

  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const draftCount = campaigns.filter((c) => c.status === "draft").length;
  const completedCount = campaigns.filter((c) => c.status === "completed").length;
  const remainingTotal = campaigns.reduce(
    (sum, c) => sum + Number(c.remaining_budget ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Create, fund and manage every campaign you run on ClipSetu.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New campaign
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Compass}
          label="Total campaigns"
          value={formatNumber(campaigns.length)}
        />
        <StatCard
          icon={CircleCheck}
          label="Active"
          value={formatNumber(activeCount)}
        />
        <StatCard icon={Clock} label="Drafts" value={formatNumber(draftCount)} />
        <StatCard
          icon={Layers}
          label="Completed"
          value={formatNumber(completedCount)}
        />
        <StatCard
          icon={IndianRupee}
          label="Total spend"
          value={formatRupees(totalSpend)}
          hint="Sum of campaign funding deposits"
        />
        <StatCard
          icon={Wallet}
          label="Remaining budget"
          value={formatRupees(remainingTotal)}
          hint="Across all campaigns"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
          <CardDescription>
            Every campaign you have created, most recent first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <Compass className="h-7 w-7 text-ink-300" aria-hidden="true" />
              <p className="mt-3 font-semibold text-ink-900">No campaigns yet</p>
              <p className="mt-1 max-w-sm text-sm text-ink-500">
                Launch your first campaign to start collecting clips from
                creators across India.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/campaigns/new">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create campaign
                </Link>
              </Button>
            </div>
          ) : (
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="pb-3 pr-4 font-medium">Campaign</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 text-right font-medium">Budget</th>
                    <th className="pb-3 pr-4 text-right font-medium">Remaining</th>
                    <th className="pb-3 pr-4 text-right font-medium">Views</th>
                    <th className="pb-3 pr-4 font-medium">Created</th>
                    <th className="pb-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="py-4 pr-4">
                        <Link
                          href={`/dashboard/campaigns/${c.id}`}
                          className="font-medium text-ink-900 hover:underline"
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {CAMPAIGN_TYPE_LABEL[c.type] ?? c.type}
                          {c.category ? ` · ${c.category}` : ""}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant={CAMPAIGN_STATUS_TONE[c.status] ?? "secondary"}>
                          {CAMPAIGN_STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4 text-right tabular-nums text-ink-700">
                        {formatRupees(c.budget)}
                      </td>
                      <td className="py-4 pr-4 text-right tabular-nums text-ink-700">
                        {formatRupees(c.remaining_budget)}
                      </td>
                      <td className="py-4 pr-4 text-right tabular-nums text-ink-700">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                          {formatNumber(viewsByCampaign[c.id] ?? 0)}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-ink-500">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="py-4 text-right">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/dashboard/campaigns/${c.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<CampaignsSkeleton />}>
      <CampaignsContent />
    </Suspense>
  );
}
