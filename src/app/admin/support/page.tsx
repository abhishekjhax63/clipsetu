import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LifeBuoy, Search } from "lucide-react";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/admin/empty-state";
import {
  AdminPriorityBadge,
  AdminStatusBadge,
} from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed",
] as const;

interface TicketRow {
  id: string;
  subject: string | null;
  category: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  guest_email: string | null;
  user_id: string | null;
  created_at: string;
}

interface ProfileMini {
  id: string;
  email: string | null;
  full_name: string | null;
}

function categoryLabel(category: string | null): string {
  if (!category) return "General";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

async function SupportConsole({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaff();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Support needs a backend">
        The support console reads tickets from Supabase. Add your project
        credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to triage tickets here.
      </SetupNotice>
    );
  }

  const params = await searchParams;
  const status =
    typeof params.status === "string" && params.status ? params.status : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createAdminClient();

  let query = supabase
    .from("support_tickets")
    .select(
      "id, subject, category, priority, status, assigned_to, guest_email, user_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if ((TICKET_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.ilike("subject", `%${q}%`);
  }

  const { data: ticketsData } = (await query) as { data: TicketRow[] | null };
  const tickets = ticketsData ?? [];

  const profileIds = Array.from(
    new Set(
      tickets.flatMap((t) =>
        [t.user_id, t.assigned_to].filter((id): id is string => Boolean(id))
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

  function requester(ticket: TicketRow): string {
    if (ticket.user_id) {
      const profile = profiles.get(ticket.user_id);
      return profile?.email ?? profile?.full_name ?? "Registered user";
    }
    return ticket.guest_email ?? "Guest";
  }

  function assignee(ticket: TicketRow): string {
    if (!ticket.assigned_to) return "Unassigned";
    const profile = profiles.get(ticket.assigned_to);
    return profile?.full_name ?? profile?.email ?? "Staff";
  }

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="q"
            className="mb-1 block text-xs font-medium text-ink-500"
          >
            Subject
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by subject…"
            autoComplete="off"
          />
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
            {TICKET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          Filter
        </Button>
      </form>

      {tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets found"
          description="No support tickets match the current filters."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-surface-muted/40">
                    <td className="max-w-[260px] px-4 py-3">
                      <Link
                        href={`/admin/support/${ticket.id}`}
                        className="block truncate font-medium text-ink-900 hover:underline"
                      >
                        {ticket.subject ?? "Support ticket"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{requester(ticket)}</td>
                    <td className="px-4 py-3 text-ink-600">
                      {categoryLabel(ticket.category)}
                    </td>
                    <td className="px-4 py-3">
                      <AdminPriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-600">{assignee(ticket)}</td>
                    <td className="px-4 py-3 text-ink-500">
                      {formatDate(ticket.created_at)}
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

export default function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Support
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Triage support tickets, reply to requesters and keep internal notes
          private.
        </p>
      </header>

      <Suspense fallback={<ConsoleSkeleton />}>
        <SupportConsole searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
