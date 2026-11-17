import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CircleCheck,
  CircleCheckBig,
  Clock,
  Compass,
  Eye,
  IndianRupee,
  Play,
  Rocket,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { isAdmin, requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  draft: "secondary",
  pending_payment: "warning",
  pending_review: "warning",
  scheduled: "info",
  active: "success",
  paused: "warning",
  completed: "secondary",
  rejected: "danger",
  cancelled: "danger",
  submitted: "info",
  processing: "info",
  approved: "success",
  revision_requested: "warning",
  metrics_unavailable: "warning",
  disputed: "danger",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {status.replace(/_/g, " ")}
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
        <p className="mt-3 text-2xl font-bold tracking-tight text-ink-900">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <Icon className="h-7 w-7 text-ink-300" aria-hidden="true" />
      <p className="mt-3 font-semibold text-ink-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function CampaignActionButton({
  href,
  label,
  icon: Icon = Rocket,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
}) {
  return (
    <Button asChild variant="secondary">
      <Link href={href}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}

async function BrandOverview({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [profileRes, campaignsRes] = await Promise.all([
    supabase
      .from("brand_profiles")
      .select("brand_name, business_category, verification_status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("campaigns")
      .select(
        "id, title, status, budget, funded_amount, remaining_budget, created_at"
      )
      .eq("brand_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const brand = profileRes.data;
  if (!brand) redirect("/onboarding");

  const campaigns = campaignsRes.data ?? [];
  const campaignIds = campaigns.map((c) => c.id);
  const countByStatus = (status: string) =>
    campaigns.filter((c) => c.status === status).length;

  const totalSpend = campaigns.reduce(
    (sum, c) => sum + Number(c.funded_amount ?? 0),
    0
  );
  const availableBalance = campaigns.reduce(
    (sum, c) => sum + Number(c.remaining_budget ?? 0),
    0
  );

  let submittedClips = 0;
  let approvedClips = 0;
  let verifiedViews = 0;

  if (campaignIds.length > 0) {
    const { data: submissions } = await supabase
      .from("submissions")
      .select("id, status")
      .in("campaign_id", campaignIds);

    const subs = submissions ?? [];
    submittedClips = subs.length;
    approvedClips = subs.filter((s) => s.status === "approved").length;

    const submissionIds = subs.map((s) => s.id);
    if (submissionIds.length > 0) {
      const { data: metrics } = await supabase
        .from("submission_metrics")
        .select("view_count")
        .in("submission_id", submissionIds)
        .eq("verification_status", "verified");

      verifiedViews = (metrics ?? []).reduce(
        (sum, m) => sum + Number(m.view_count ?? 0),
        0
      );
    }
  }

  const isVerified = brand.verification_status === "verified";
  const recent = campaigns.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Welcome back, {brand.brand_name ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {brand.business_category ?? "Brand"} account
          </p>
        </div>
        <Badge variant={isVerified ? "success" : "warning"} className="w-fit">
          {isVerified ? (
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isVerified
            ? "Verified brand"
            : `Verification: ${brand.verification_status.replace(/_/g, " ")}`}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Compass}
          label="Total campaigns"
          value={formatNumber(campaigns.length)}
        />
        <StatCard
          icon={CircleCheck}
          label="Active campaigns"
          value={formatNumber(countByStatus("active"))}
        />
        <StatCard
          icon={Clock}
          label="Draft campaigns"
          value={formatNumber(countByStatus("draft"))}
        />
        <StatCard
          icon={CircleCheckBig}
          label="Completed campaigns"
          value={formatNumber(countByStatus("completed"))}
        />
        <StatCard
          icon={IndianRupee}
          label="Total campaign spend"
          value={formatINR(totalSpend)}
          hint="Funds deposited across your campaigns"
        />
        <StatCard
          icon={Wallet}
          label="Available campaign balance"
          value={formatINR(availableBalance)}
          hint="Unspent reward budget"
        />
        <StatCard
          icon={Play}
          label="Submitted clips"
          value={formatNumber(submittedClips)}
        />
        <StatCard
          icon={BadgeCheck}
          label="Approved clips"
          value={formatNumber(approvedClips)}
        />
        <StatCard
          icon={Eye}
          label="Total verified views"
          value={formatNumber(verifiedViews)}
          hint="API-verified views only"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent campaigns</CardTitle>
            <CardDescription>Your latest campaigns and their status</CardDescription>
          </div>
          <CampaignActionButton
            href="/dashboard/campaigns/new"
            label="New campaign"
          />
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No campaigns yet"
              description="Create your first campaign, fund it and let creators start clipping."
              action={
                <Button asChild>
                  <Link href="/dashboard/campaigns/new">
                    <Rocket className="h-4 w-4" aria-hidden="true" />
                    Create campaign
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border-soft">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/campaigns/${c.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {c.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {formatINR(Number(c.budget))} budget ·{" "}
                        {formatINR(Number(c.remaining_budget ?? 0))} left ·{" "}
                        {formatDate(c.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-brand-100 bg-brand-50">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink-900">
              Ready to launch your next campaign?
            </p>
            <p className="mt-1 text-sm text-ink-600">
              Fund a campaign, set your rewards and let creators start clipping.
            </p>
          </div>
          <CampaignActionButton
            href="/dashboard/campaigns"
            label="Manage campaigns"
            icon={Compass}
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function ClipperOverview({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [profileRes, walletRes, submissionsRes, approvedRes] =
    await Promise.all([
      supabase
        .from("creator_profiles")
        .select("username, kyc_status, categories")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("wallets")
        .select("available, total_earned, pending")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("submissions")
        .select("id, status, platform, submitted_at, campaigns(title)")
        .eq("creator_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(5),
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId)
        .eq("status", "approved"),
    ]);

  const profile = profileRes.data;
  if (!profile) redirect("/onboarding");

  const wallet = walletRes.data;
  const submissions = submissionsRes.data ?? [];
  const kycVerified = profile.kyc_status === "verified";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Hey @{profile.username ?? "creator"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {profile.categories.length > 0
              ? profile.categories.join(" · ")
              : "Creator account"}
          </p>
        </div>
        <Badge variant={kycVerified ? "success" : "warning"} className="w-fit">
          {kycVerified ? (
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {kycVerified
            ? "KYC verified"
            : `KYC: ${profile.kyc_status.replace(/_/g, " ")}`}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Available balance"
          value={formatINR(Number(wallet?.available ?? 0))}
          hint="Withdrawable once KYC & payouts are live"
        />
        <StatCard
          icon={TrendingUp}
          label="Total earned"
          value={formatINR(Number(wallet?.total_earned ?? 0))}
        />
        <StatCard
          icon={CircleCheck}
          label="Approved clips"
          value={formatNumber(approvedRes.count ?? 0)}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent submissions</CardTitle>
            <CardDescription>Clips you have submitted to campaigns</CardDescription>
          </div>
          <Button asChild variant="secondary">
            <Link href="/campaigns">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Browse campaigns
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No submissions yet"
              description="Browse active campaigns and submit your first clip. Your submissions and earnings will show up here."
              action={
                <Button asChild>
                  <Link href="/campaigns">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    Explore campaigns
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border-soft">
              {submissions.map((s) => {
                const rel = s.campaigns as
                  | { title: string }[]
                  | { title: string }
                  | null;
                const campaign = Array.isArray(rel) ? rel[0] ?? null : rel;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {campaign?.title ?? "Campaign"}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-ink-400">
                        {s.platform} · {formatDate(s.submitted_at)}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-brand-100 bg-brand-50">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink-900">
              Get paid for every verified view
            </p>
            <p className="mt-1 text-sm text-ink-600">
              Complete KYC to unlock withdrawals once payouts go live.
            </p>
          </div>
          <Badge variant={kycVerified ? "success" : "warning"}>
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {kycVerified ? "Eligible for payouts" : "KYC pending"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

async function DashboardOverview() {
  const user = await requireAuth();

  if (isAdmin(user.role)) redirect("/admin");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Dashboard needs a backend">
        Sign-in works, but your dashboard reads live data from Supabase. Add your
        project credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to see real account data — nothing here is faked.
      </SetupNotice>
    );
  }

  return user.role === "brand" ? (
    <BrandOverview userId={user.id} />
  ) : (
    <ClipperOverview userId={user.id} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardOverview />
    </Suspense>
  );
}
