import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, Scale } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { DisputeStatusBadge } from "@/components/support/status-badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dispute detail",
  robots: { index: false, follow: false },
};

interface DisputeRow {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  description: string | null;
  resolution: string | null;
  campaign_id: string | null;
  submission_id: string | null;
  created_at: string;
  updated_at: string;
}

async function DisputeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Disputes need a backend">
        Dispute details are read from Supabase. Configure your project and apply
        the migrations to view this dispute.
      </SetupNotice>
    );
  }

  await requireAuth();
  const supabase = await createClient();

  // The owner-select policy (raised_by = auth.uid()) means other users' disputes
  // are invisible here and resolve to a 404.
  const { data: dispute } = (await supabase
    .from("disputes")
    .select(
      "id, type, status, subject, description, resolution, campaign_id, submission_id, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle()) as { data: DisputeRow | null };

  if (!dispute) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/disputes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to disputes
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DisputeStatusBadge status={dispute.status} />
          <Badge variant="outline">
            {dispute.type.charAt(0).toUpperCase() + dispute.type.slice(1)}
          </Badge>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {dispute.subject ?? "Dispute"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Raised {formatDate(dispute.created_at)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-ink-400" aria-hidden="true" />
            Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm text-ink-600">
            {dispute.description ?? "No description was provided."}
          </p>
        </CardContent>
      </Card>

      {dispute.resolution ? (
        <Card className="border-mint-200 bg-gradient-earn-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resolution</CardTitle>
            <CardDescription>How this dispute was resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-ink-700">
              {dispute.resolution}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink-600">
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Type</span>
            <span className="font-medium capitalize text-ink-900">
              {dispute.type}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Status</span>
            <span className="font-medium capitalize text-ink-900">
              {dispute.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Last updated</span>
            <span className="font-medium text-ink-900">
              {formatDate(dispute.updated_at)}
            </span>
          </div>
          {dispute.campaign_id ? (
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Campaign</span>
              <span className="font-mono text-xs text-ink-700">
                {dispute.campaign_id}
              </span>
            </div>
          ) : null}
          {dispute.submission_id ? (
            <div className="flex justify-between gap-3">
              <span className="text-ink-500">Submission</span>
              <span className="font-mono text-xs text-ink-700">
                {dispute.submission_id}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-info/20 bg-info-soft/40">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-ink-600">
            This dispute is read-only for you. Our team updates the status and
            resolution here as the review progresses.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-20 w-2/3 rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DisputeDetail params={params} />
    </Suspense>
  );
}
