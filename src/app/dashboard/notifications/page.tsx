import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";
import { NotificationList, type NotificationItemView } from "./notification-list";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

interface NotificationRow {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

async function NotificationsPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Notifications need a backend">
        Your notifications are read from Supabase. Add your project credentials
        and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to see them here — nothing is faked.
      </SetupNotice>
    );
  }

  const user = await requireAuth();
  const supabase = await createClient();

  const { data } = (await supabase
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)) as { data: NotificationRow[] | null };

  const items: NotificationItemView[] = (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    read: row.read,
    when: timeAgo(row.created_at),
  }));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <Bell className="h-7 w-7 text-ink-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink-900">
          You&apos;re all caught up
        </p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Updates about your campaigns, submissions, rewards and account will
          appear here.
        </p>
      </div>
    );
  }

  return <NotificationList items={items} />;
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Your latest account activity, newest first.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/dashboard/settings/notifications">
            <Settings className="h-4 w-4" aria-hidden="true" />
            Notification settings
          </Link>
        </Button>
      </header>

      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsPanel />
      </Suspense>
    </div>
  );
}
