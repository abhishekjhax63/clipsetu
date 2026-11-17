import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, TrendingUp, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
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
  formatRupees,
} from "@/lib/campaigns";
import { FundForm } from "./fund-form";

export const metadata: Metadata = {
  title: "Fund campaign",
  robots: { index: false, follow: false },
};

interface FundCampaignRow {
  id: string;
  brand_id: string;
  title: string;
  status: string;
  budget: number;
  funded_amount: number;
  remaining_budget: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
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

async function FundCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("brand");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Campaign funding needs a backend">
        Funding reads live campaign budgets from Supabase and processes payments
        through the payment provider. Configure your project and apply the
        migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to fund real campaigns — nothing is simulated.
      </SetupNotice>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select(
      "id, brand_id, title, status, budget, funded_amount, remaining_budget"
    )
    .eq("id", id)
    .maybeSingle();

  const campaign = data as FundCampaignRow | null;
  if (!campaign || campaign.brand_id !== user.id) notFound();

  const budget = Number(campaign.budget ?? 0);
  const funded = Number(campaign.funded_amount ?? 0);
  const remaining = Number(campaign.remaining_budget ?? 0);
  const stillNeeded = Math.max(0, budget - funded);
  const paymentsEnabled = isRazorpayConfigured();

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
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                Fund campaign
              </h1>
              <Badge variant={CAMPAIGN_STATUS_TONE[campaign.status] ?? "secondary"}>
                {CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink-500">{campaign.title}</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/dashboard/campaigns/${campaign.id}`}>
              View campaign
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Budget" value={formatRupees(budget)} />
        <StatCard
          icon={TrendingUp}
          label="Funded"
          value={formatRupees(funded)}
          hint="Confirmed deposits"
        />
        <StatCard
          icon={Wallet}
          label="Remaining"
          value={formatRupees(remaining)}
          hint="Available to pay rewards"
        />
        <StatCard
          icon={TrendingUp}
          label="Amount still needed"
          value={formatRupees(stillNeeded)}
          hint="To fully fund the budget"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add budget</CardTitle>
          <CardDescription>
            Fund this campaign&apos;s budget so it can pay creator rewards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsEnabled ? (
            <FundForm
              campaignId={campaign.id}
              campaignTitle={campaign.title}
              stillNeeded={stillNeeded}
            />
          ) : (
            <SetupNotice title="Online payments are not enabled">
              Brand funding is processed through Razorpay. Add the{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                RAZORPAY_KEY_ID
              </code>{" "}
              and{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                RAZORPAY_KEY_SECRET
              </code>{" "}
              environment variables (and complete provider onboarding) to accept
              real payments. Nothing is simulated while unconfigured.
            </SetupNotice>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-border-soft bg-surface-soft p-4 text-sm leading-relaxed text-ink-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
        <span>
          Your budget is credited only after the payment is{" "}
          <strong>verified</strong> with the provider server-side. A campaign can
          go live once its budget has been funded.
        </span>
      </div>
    </div>
  );
}

function FundSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}

export default function FundCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<FundSkeleton />}>
      <FundCampaign params={params} />
    </Suspense>
  );
}
