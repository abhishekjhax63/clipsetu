import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleCheckBig, Clock, Compass } from "lucide-react";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CAMPAIGN_STATUSES } from "@/lib/constants";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";
import { CampaignRowActions } from "./campaign-row-actions";

export const metadata: Metadata = {
  title: "Campaign moderation — Admin",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface CampaignRow {
  id: string;
  title: string;
  brand_id: string;
  status: string;
  budget: number;
  funded_amount: number;
  remaining_budget: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

async function CampaignsInner({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Campaign moderation needs a backend">
        Campaign moderation reads live campaigns from Supabase. Add your project
        credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to review real campaigns — nothing here is faked.
      </SetupNotice>
    );
  }

  const params = await searchParams;
  const statusFilter =
    typeof params.status === "string" ? params.status.trim() : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createAdminClient();

  let query = supabase
    .from("campaigns")
    .select(
      "id, title, brand_id, status, budget, funded_amount, remaining_budget, start_date, end_date, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (q) query = query.ilike("title", `%${q}%`);

  const [campaignsRes, totalRes, reviewRes, liveRes] = await Promise.all([
    query,
    supabase.from("campaigns").select("id", { count: "exact", head: true }),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "scheduled"]),
  ]);

  const campaigns = (campaignsRes.data ?? []) as CampaignRow[];

  const brandIds = Array.from(new Set(campaigns.map((c) => c.brand_id)));
  const brands = brandIds.length
    ? (
        await supabase
          .from("brand_profiles")
          .select("user_id, brand_name")
          .in("user_id", brandIds)
      ).data ?? []
    : [];
  const brandMap = new Map<string, string | null>(
    brands.map((b) => [b.user_id as string, b.brand_name as string | null])
  );

  const campaignIds = campaigns.map((c) => c.id);
  const submissions = campaignIds.length
    ? (
        await supabase
          .from("submissions")
          .select("campaign_id")
          .in("campaign_id", campaignIds)
      ).data ?? []
    : [];
  const submissionCounts = new Map<string, number>();
  for (const row of submissions) {
    const key = row.campaign_id as string;
    submissionCounts.set(key, (submissionCounts.get(key) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Campaign moderation
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Review, approve and manage every campaign on the platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Compass}
          label="Total campaigns"
          value={formatNumber(totalRes.count ?? 0)}
        />
        <StatCard
          icon={Clock}
          label="Awaiting review"
          value={formatNumber(reviewRes.count ?? 0)}
        />
        <StatCard
          icon={CircleCheckBig}
          label="Live / scheduled"
          value={formatNumber(liveRes.count ?? 0)}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q">Search title</Label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Campaign title"
                className="w-56"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="flex h-11 w-48 rounded-lg border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25"
              >
                <option value="">All statuses</option>
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
          <CardDescription>
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} shown
            {campaigns.length === 100 ? " (most recent 100)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No campaigns found"
              description="No campaigns match the current filters. Adjust the search or status filter to see more."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2 pr-4 font-medium">Campaign</th>
                    <th className="py-2 pr-4 font-medium">Brand</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 text-right font-medium">Budget</th>
                    <th className="py-2 pr-4 text-right font-medium">Funded</th>
                    <th className="py-2 pr-4 text-right font-medium">
                      Remaining
                    </th>
                    <th className="py-2 pr-4 font-medium">Window</th>
                    <th className="py-2 pr-4 text-right font-medium">Subs</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-ink-900">{c.title}</p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          Created {formatDate(c.created_at)}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-ink-600">
                        {brandMap.get(c.brand_id) ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <AdminStatusBadge status={c.status} />
                      </td>
                      <td className="py-3 pr-4 text-right text-ink-700">
                        {formatINR(Number(c.budget))}
                      </td>
                      <td className="py-3 pr-4 text-right text-ink-700">
                        {formatINR(Number(c.funded_amount))}
                      </td>
                      <td className="py-3 pr-4 text-right text-ink-700">
                        {formatINR(Number(c.remaining_budget))}
                      </td>
                      <td className="py-3 pr-4 text-xs text-ink-500">
                        {c.start_date ? formatDate(c.start_date) : "—"} →{" "}
                        {c.end_date ? formatDate(c.end_date) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right text-ink-700">
                        {formatNumber(submissionCounts.get(c.id) ?? 0)}
                      </td>
                      <td className="py-3">
                        <CampaignRowActions
                          campaignId={c.id}
                          status={c.status}
                        />
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

export default function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <CampaignsInner searchParams={searchParams} />
    </Suspense>
  );
}
