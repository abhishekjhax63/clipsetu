import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, Scale } from "lucide-react";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { AdminStatusBadge } from "@/components/admin/status-badges";
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
import { DisputeControls } from "./dispute-controls";

export const metadata: Metadata = {
  title: "Dispute detail",
  robots: { index: false, follow: false },
};

interface DisputeRow {
  id: string;
  raised_by: string;
  against_user: string | null;
  campaign_id: string | null;
  submission_id: string | null;
  type: string;
  status: string;
  subject: string | null;
  description: string | null;
  resolution: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileMini {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface CampaignMini {
  id: string;
  title: string | null;
}

interface SubmissionMini {
  id: string;
  platform: string | null;
  post_url: string | null;
  status: string | null;
}

function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function DisputeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Disputes need a backend">
        Dispute details are read from Supabase. Configure your project and apply
        the migrations to review this dispute.
      </SetupNotice>
    );
  }

  const supabase = await createAdminClient();

  const { data: dispute } = (await supabase
    .from("disputes")
    .select(
      "id, raised_by, against_user, campaign_id, submission_id, type, status, subject, description, resolution, assigned_to, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle()) as { data: DisputeRow | null };

  if (!dispute) notFound();

  const profileIds = Array.from(
    new Set(
      [dispute.raised_by, dispute.against_user, dispute.assigned_to].filter(
        (value): value is string => Boolean(value)
      )
    )
  );

  const profiles = new Map<string, ProfileMini>();
  if (profileIds.length > 0) {
    const { data: profilesData } = (await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", profileIds)) as { data: ProfileMini[] | null };
    for (const profile of profilesData ?? []) {
      profiles.set(profile.id, profile);
    }
  }

  let campaign: CampaignMini | null = null;
  if (dispute.campaign_id) {
    const { data } = (await supabase
      .from("campaigns")
      .select("id, title")
      .eq("id", dispute.campaign_id)
      .maybeSingle()) as { data: CampaignMini | null };
    campaign = data;
  }

  let submission: SubmissionMini | null = null;
  if (dispute.submission_id) {
    const { data } = (await supabase
      .from("submissions")
      .select("id, platform, post_url, status")
      .eq("id", dispute.submission_id)
      .maybeSingle()) as { data: SubmissionMini | null };
    submission = data;
  }

  function labelFor(userId: string | null): string {
    if (!userId) return "—";
    const profile = profiles.get(userId);
    return profile?.full_name ?? profile?.email ?? "Staff";
  }

  const isAssigned = Boolean(dispute.assigned_to);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to disputes
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusBadge status={dispute.status} />
          <Badge variant="outline">{label(dispute.type)}</Badge>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {dispute.subject ?? "Dispute"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Raised by {labelFor(dispute.raised_by)} ·{" "}
            {formatDate(dispute.created_at)}
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
          <CardTitle className="text-base">Linked records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-ink-500">Campaign</span>
            <span className="text-right font-medium text-ink-900">
              {dispute.campaign_id ? (
                <Link
                  href="/admin/campaigns"
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  {campaign?.title ?? "View campaign"}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                "Not linked"
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-ink-500">Submission</span>
            <span className="text-right font-medium text-ink-900">
              {dispute.submission_id ? (
                submission?.post_url ? (
                  <a
                    href={submission.post_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    {submission.platform
                      ? label(submission.platform)
                      : "Open submission"}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  (submission?.platform ?? "Submission")
                )
              ) : (
                "Not linked"
              )}
            </span>
          </div>
          {submission?.status ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-ink-500">Submission status</span>
              <AdminStatusBadge status={submission.status} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Raised by</span>
            <span className="font-medium text-ink-900">
              {labelFor(dispute.raised_by)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Against</span>
            <span className="font-medium text-ink-900">
              {labelFor(dispute.against_user)}
            </span>
          </div>
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
            <span className="text-ink-500">Assigned to</span>
            <span className="font-medium text-ink-900">
              {isAssigned ? labelFor(dispute.assigned_to) : "Unassigned"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Last updated</span>
            <span className="font-medium text-ink-900">
              {formatDate(dispute.updated_at)}
            </span>
          </div>
        </CardContent>
      </Card>

      <DisputeControls
        disputeId={dispute.id}
        status={dispute.status}
        resolution={dispute.resolution}
      />

      <Card className="border-info/20 bg-info-soft/40">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-ink-600">
            Resolving or rejecting a dispute notifies the person who raised it.
            Record a clear resolution so the outcome is auditable.
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
      <Skeleton className="h-48 w-full rounded-2xl" />
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
