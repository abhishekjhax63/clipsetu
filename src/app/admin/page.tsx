import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Activity,
  Banknote,
  CircleCheck,
  Coins,
  Compass,
  FileText,
  Scale,
  ShieldCheck,
  TriangleExclamationPoint,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/admin/empty-state";
import { StatCard } from "@/components/admin/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin overview — ClipSetu",
  robots: { index: false, follow: false },
};

interface ActivityRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_role: string | null;
  created_at: string;
  profiles:
    | { email: string | null; full_name: string | null }
    | { email: string | null; full_name: string | null }[]
    | null;
}

interface Overview {
  totalUsers: number;
  totalBrands: number;
  totalClippers: number;
  brandsInVerification: number;
  submissionsInReview: number;
  activeCampaigns: number;
  totalFunding: number;
  totalCreatorRewards: number;
  pendingWithdrawals: number;
  completedPayouts: number;
  failedPayouts: number;
  disputedSubmissions: number;
  flaggedMetrics: number;
  fraudAlerts: number;
  activity: ActivityRow[];
}

/** PostgREST aggregate (`sum()`) returns a single row shaped `{ total }`. */
function aggregateTotal(rows: unknown): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const value = (rows[0] as Record<string, unknown>)?.total;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function activityActor(row: ActivityRow): string {
  const rel = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
  if (rel?.full_name) return rel.full_name;
  if (rel?.email) return rel.email;
  return row.actor_role ? row.actor_role.replace(/_/g, " ") : "system";
}

async function loadOverview(): Promise<Overview> {
  const supabase = await createAdminClient();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    usersRes,
    brandsRes,
    clippersRes,
    brandVerificationRes,
    submissionsReviewRes,
    activeCampaignsRes,
    fundingRes,
    rewardsRes,
    pendingWithdrawalsRes,
    completedPayoutsRes,
    failedPayoutsRes,
    disputesRes,
    flaggedMetricsRes,
    fraudAlertsRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "brand"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "clipper"),
    supabase
      .from("brand_profiles")
      .select("id", { count: "exact", head: true })
      .in("verification_status", ["pending", "under_review"]),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("status", ["submitted", "pending_review", "processing"]),
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("campaigns").select("total:funded_amount.sum()"),
    supabase
      .from("wallet_transactions")
      .select("total:amount.sum()")
      .eq("type", "reward")
      .eq("direction", "credit"),
    supabase
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "disputed"),
    supabase
      .from("submission_metrics")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "flagged"),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .ilike("action", "fraud%")
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("audit_logs")
      .select(
        "id, action, entity_type, entity_id, actor_role, created_at, profiles(email, full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    totalUsers: usersRes.count ?? 0,
    totalBrands: brandsRes.count ?? 0,
    totalClippers: clippersRes.count ?? 0,
    brandsInVerification: brandVerificationRes.count ?? 0,
    submissionsInReview: submissionsReviewRes.count ?? 0,
    activeCampaigns: activeCampaignsRes.count ?? 0,
    totalFunding: aggregateTotal(fundingRes.data),
    totalCreatorRewards: aggregateTotal(rewardsRes.data),
    pendingWithdrawals: pendingWithdrawalsRes.count ?? 0,
    completedPayouts: completedPayoutsRes.count ?? 0,
    failedPayouts: failedPayoutsRes.count ?? 0,
    disputedSubmissions: disputesRes.count ?? 0,
    flaggedMetrics: flaggedMetricsRes.count ?? 0,
    fraudAlerts: fraudAlertsRes.count ?? 0,
    activity: (activityRes.data ?? []) as ActivityRow[],
  };
}

async function AdminOverview() {
  await requireAdmin();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Admin overview needs a backend">
        The admin dashboard reads live aggregates from Supabase. Add your
        project credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to see real platform metrics — nothing here is faked.
      </SetupNotice>
    );
  }

  const data = await loadOverview();
  const suspiciousAlerts = data.flaggedMetrics + data.fraudAlerts;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Platform overview
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Live counts and money movement across ClipSetu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total users"
          value={formatNumber(data.totalUsers)}
        />
        <StatCard
          icon={Compass}
          label="Brands"
          value={formatNumber(data.totalBrands)}
        />
        <StatCard
          icon={UserRound}
          label="Clippers"
          value={formatNumber(data.totalClippers)}
        />
        <StatCard
          icon={ShieldCheck}
          label="Brands awaiting review"
          value={formatNumber(data.brandsInVerification)}
          hint="Pending or under review"
        />
        <StatCard
          icon={Compass}
          label="Active campaigns"
          value={formatNumber(data.activeCampaigns)}
        />
        <StatCard
          icon={FileText}
          label="Submissions in review"
          value={formatNumber(data.submissionsInReview)}
        />
        <StatCard
          icon={Wallet}
          label="Total campaign funding"
          value={formatINR(data.totalFunding)}
          hint="Sum of funded campaigns"
        />
        <StatCard
          icon={Coins}
          label="Total creator rewards"
          value={formatINR(data.totalCreatorRewards)}
          hint="Credited rewards"
        />
        <StatCard
          icon={Banknote}
          label="Pending withdrawals"
          value={formatNumber(data.pendingWithdrawals)}
        />
        <StatCard
          icon={CircleCheck}
          label="Completed payouts"
          value={formatNumber(data.completedPayouts)}
        />
        <StatCard
          icon={TriangleExclamationPoint}
          label="Failed payouts"
          value={formatNumber(data.failedPayouts)}
        />
        <StatCard
          icon={Scale}
          label="Disputed submissions"
          value={formatNumber(data.disputedSubmissions)}
        />
        <StatCard
          icon={ShieldCheck}
          label="Suspicious-activity alerts"
          value={formatNumber(suspiciousAlerts)}
          hint="Flagged metrics + fraud logs (7d)"
        />
        <StatCard
          icon={Activity}
          label="Flagged metrics"
          value={formatNumber(data.flaggedMetrics)}
          hint="Verification flagged"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent privileged activity</CardTitle>
          <CardDescription>
            The latest audit-trail entries across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.activity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No audit activity yet"
              description="Privileged actions are recorded here as staff and services perform them."
            />
          ) : (
            <ul className="divide-y divide-border-soft">
              {data.activity.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">
                      {row.action}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {activityActor(row)}
                      {row.entity_type
                        ? ` · ${row.entity_type.replace(/_/g, " ")}`
                        : ""}
                    </p>
                  </div>
                  <time
                    dateTime={row.created_at}
                    className="shrink-0 text-xs text-ink-400"
                  >
                    {formatDate(row.created_at, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <AdminOverview />
    </Suspense>
  );
}
