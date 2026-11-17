import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Scale } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { DisputeStatusBadge } from "@/components/support/status-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Disputes",
  robots: { index: false, follow: false },
};

interface DisputeListItem {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  created_at: string;
}

function typeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function DisputesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

async function DisputesList() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Disputes need a backend">
        Your disputes are stored in Supabase. Add your project credentials and
        apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to raise and track them here.
      </SetupNotice>
    );
  }

  const user = await requireAuth();
  const supabase = await createClient();

  const { data } = (await supabase
    .from("disputes")
    .select("id, type, status, subject, created_at")
    .eq("raised_by", user.id)
    .order("created_at", { ascending: false })) as {
    data: DisputeListItem[] | null;
  };

  const disputes = data ?? [];

  if (disputes.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <Scale className="h-7 w-7 text-ink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink-900">No disputes raised</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          If a submission, payment or campaign decision looks wrong, raise a
          dispute and our team will review it.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/disputes/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Raise a dispute
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {disputes.map((dispute) => (
        <li key={dispute.id}>
          <Link
            href={`/dashboard/disputes/${dispute.id}`}
            className="block rounded-2xl border border-border-soft bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {dispute.subject ?? "Dispute"}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {typeLabel(dispute.type)} dispute · {formatDate(dispute.created_at)}
                </p>
              </div>
              <DisputeStatusBadge status={dispute.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Disputes
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Disputes you have raised and their review status.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/disputes/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Raise a dispute
          </Link>
        </Button>
      </header>

      <Suspense fallback={<DisputesSkeleton />}>
        <DisputesList />
      </Suspense>
    </div>
  );
}
