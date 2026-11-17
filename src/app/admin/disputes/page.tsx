import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Scale, Search } from "lucide-react";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Disputes",
  robots: { index: false, follow: false },
};

const DISPUTE_TYPES = ["submission", "payment", "campaign", "account"] as const;
const DISPUTE_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;

interface DisputeRow {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  raised_by: string;
  campaign_id: string | null;
  submission_id: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface ProfileMini {
  id: string;
  email: string | null;
  full_name: string | null;
}

function label(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function DisputesConsole({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Disputes need a backend">
        The disputes console reads from Supabase. Add your project credentials
        and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to review disputes here.
      </SetupNotice>
    );
  }

  const params = await searchParams;
  const status =
    typeof params.status === "string" && params.status ? params.status : "";
  const type =
    typeof params.type === "string" && params.type ? params.type : "";

  const supabase = await createAdminClient();

  let query = supabase
    .from("disputes")
    .select(
      "id, type, status, subject, raised_by, campaign_id, submission_id, assigned_to, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if ((DISPUTE_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }
  if ((DISPUTE_TYPES as readonly string[]).includes(type)) {
    query = query.eq("type", type);
  }

  const { data: disputesData } = (await query) as { data: DisputeRow[] | null };
  const disputes = disputesData ?? [];

  const profileIds = Array.from(
    new Set(
      disputes.flatMap((d) =>
        [d.raised_by, d.assigned_to].filter((id): id is string =>
          Boolean(id)
        )
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

  function raiserEmail(dispute: DisputeRow): string {
    const profile = profiles.get(dispute.raised_by);
    return profile?.email ?? profile?.full_name ?? "—";
  }

  function assignee(dispute: DisputeRow): string {
    if (!dispute.assigned_to) return "Unassigned";
    const profile = profiles.get(dispute.assigned_to);
    return profile?.full_name ?? profile?.email ?? "Staff";
  }

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div>
          <label
            htmlFor="type"
            className="mb-1 block text-xs font-medium text-ink-500"
          >
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:border-mint-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
          >
            <option value="">All types</option>
            {DISPUTE_TYPES.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="status"
            className="mb-1 block text-xs font-medium text-ink-500"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:border-mint-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
          >
            <option value="">All statuses</option>
            {DISPUTE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Filter
        </Button>
      </form>

      {disputes.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No disputes found"
          description="No disputes match the current filters."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Raised by</th>
                  <th className="px-4 py-3">Refs</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {disputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3 text-ink-600">{label(dispute.type)}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge status={dispute.status} />
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <Link
                        href={`/admin/disputes/${dispute.id}`}
                        className="block truncate font-medium text-ink-900 hover:underline"
                      >
                        {dispute.subject ?? "Dispute"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {raiserEmail(dispute)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-500">
                      {dispute.campaign_id ? (
                        <div className="truncate" title={dispute.campaign_id}>
                          campaign: {dispute.campaign_id.slice(0, 8)}…
                        </div>
                      ) : null}
                      {dispute.submission_id ? (
                        <div className="truncate" title={dispute.submission_id}>
                          submission: {dispute.submission_id.slice(0, 8)}…
                        </div>
                      ) : null}
                      {!dispute.campaign_id && !dispute.submission_id ? "—" : null}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {assignee(dispute)}
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {formatDate(dispute.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export default function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Disputes
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Review disputes raised by creators and brands, and record outcomes.
        </p>
      </header>

      <Suspense fallback={<ConsoleSkeleton />}>
        <DisputesConsole searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
