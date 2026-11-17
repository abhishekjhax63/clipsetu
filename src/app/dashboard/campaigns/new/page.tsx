import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignWizard } from "./campaign-wizard";

export const metadata: Metadata = {
  title: "New campaign",
  robots: { index: false, follow: false },
};

async function NewCampaignGate() {
  await requireRole("brand");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Creating campaigns needs a backend">
        The wizard saves campaigns to Supabase. Add your project credentials and
        apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        before launching a campaign.
      </SetupNotice>
    );
  }

  return <CampaignWizard />;
}

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to campaigns
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Create a campaign
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Nine quick steps to brief creators, set rewards and launch.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-2xl" />}>
        <NewCampaignGate />
      </Suspense>
    </div>
  );
}
