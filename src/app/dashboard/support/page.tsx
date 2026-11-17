import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/status-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

interface TicketListItem {
  id: string;
  subject: string | null;
  category: string | null;
  priority: string;
  status: string;
  updated_at: string;
}

function categoryLabel(category: string | null): string {
  if (!category) return "General";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function SupportSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

async function SupportList() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Support needs a backend">
        Your support tickets are stored in Supabase. Add your project credentials
        and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to raise and track tickets here.
      </SetupNotice>
    );
  }

  const user = await requireAuth();
  const supabase = await createClient();

  const { data } = (await supabase
    .from("support_tickets")
    .select("id, subject, category, priority, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })) as {
    data: TicketListItem[] | null;
  };

  const tickets = data ?? [];

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <LifeBuoy className="h-7 w-7 text-ink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink-900">No support tickets yet</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Need a hand with a campaign, payment or your account? Open a ticket and
          our team will pick it up.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/support/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New ticket
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <Link
            href={`/dashboard/support/${ticket.id}`}
            className="block rounded-2xl border border-border-soft bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {ticket.subject ?? "Support ticket"}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {categoryLabel(ticket.category)} · updated{" "}
                  {formatDate(ticket.updated_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Support
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Your support tickets and the replies from our team.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/support/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New ticket
          </Link>
        </Button>
      </header>

      <Suspense fallback={<SupportSkeleton />}>
        <SupportList />
      </Suspense>
    </div>
  );
}
