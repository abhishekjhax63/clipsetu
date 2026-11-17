import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Compass, ListChecks, TriangleExclamationPoint } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { SubmissionStatusBadge } from "@/components/clipper/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { platformLabel } from "@/lib/verification";

export const metadata: Metadata = {
  title: "My submissions",
  robots: { index: false, follow: false },
};

interface SubmissionListItem {
  id: string;
  platform: string;
  post_url: string;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
  campaigns: { title: string | null }[] | { title: string | null } | null;
}

function campaignTitle(
  relation: SubmissionListItem["campaigns"]
): string | null {
  if (Array.isArray(relation)) return relation[0]?.title ?? null;
  return relation?.title ?? null;
}

function SubmissionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

async function SubmissionsList() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Submissions need a backend">
        Your submissions are read from Supabase. Add your project credentials and
        apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to see them here.
      </SetupNotice>
    );
  }

  const user = await requireRole("clipper");
  const supabase = await createClient();

  const { data } = (await supabase
    .from("submissions")
    .select(
      "id, platform, post_url, status, rejection_reason, submitted_at, campaigns(title)"
    )
    .eq("creator_id", user.id)
    .order("submitted_at", { ascending: false })) as {
    data: SubmissionListItem[] | null;
  };

  const submissions = data ?? [];

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <ListChecks className="h-7 w-7 text-ink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink-900">No submissions yet</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Join a campaign and submit your first clip. Everything you publish will
          appear here with its review status.
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

  return (
    <ul className="space-y-3">
      {submissions.map((submission) => (
        <li key={submission.id}>
          <Link
            href={`/dashboard/submissions/${submission.id}`}
            className="block rounded-2xl border border-border-soft bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {campaignTitle(submission.campaigns) ?? "Campaign"}
                </p>
                <p className="mt-0.5 text-xs capitalize text-ink-400">
                  {platformLabel(submission.platform)} ·{" "}
                  {formatDate(submission.submitted_at)}
                </p>
              </div>
              <SubmissionStatusBadge status={submission.status} />
            </div>

            {submission.status === "rejected" && submission.rejection_reason ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/40 p-3 text-xs text-ink-600">
                <TriangleExclamationPoint
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-medium text-ink-700">Rejected: </span>
                  {submission.rejection_reason}
                </span>
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-end text-xs font-medium text-ink-500">
              View details
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SubmissionsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            My submissions
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Track every clip you have submitted and its review status.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/submissions/new">Submit a clip</Link>
        </Button>
      </header>

      <Card className="border-info/20 bg-info-soft/40">
        <CardContent className="flex items-start gap-3 p-4">
          <TriangleExclamationPoint
            className="mt-0.5 h-4 w-4 shrink-0 text-info"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-ink-600">
            Submitting a link does not prove views or guarantee payment. Rewards
            are calculated only from API-verified metrics for approved
            submissions.
          </p>
        </CardContent>
      </Card>

      <Suspense fallback={<SubmissionsSkeleton />}>
        <SubmissionsList />
      </Suspense>
    </div>
  );
}
