import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Settings } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

interface ProfileRow {
  full_name: string | null;
  role: string | null;
  created_at: string | null;
}

async function SettingsPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Settings need a backend">
        Your account details are read from Supabase. Add your project
        credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to manage them here.
      </SetupNotice>
    );
  }

  const user = await requireAuth();
  const supabase = await createClient();

  const { data } = (await supabase
    .from("profiles")
    .select("full_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle()) as { data: ProfileRow | null };

  const name = data?.full_name ?? user.fullName ?? "Account";
  const role = data?.role ?? user.role;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information on ClipSetu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-900">{name}</p>
              <p className="truncate text-sm text-ink-500">{user.email}</p>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Role
              </dt>
              <dd className="mt-1">
                <Badge variant="secondary" className="capitalize">
                  {role.replace("_", " ")}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Member since
              </dt>
              <dd className="mt-1 text-sm text-ink-700">
                {data?.created_at ? formatDate(data.created_at) : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose how you want to hear from ClipSetu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard/settings/notifications"
            className="flex items-center justify-between gap-3 rounded-2xl border border-border-soft p-4 transition-colors hover:bg-surface-muted"
          >
            <span className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-mint-100 text-mint-700"
                aria-hidden="true"
              >
                <Bell className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-medium text-ink-900">
                  Notification preferences
                </span>
                <span className="block text-sm text-ink-500">
                  Email, in-app and marketing toggles
                </span>
              </span>
            </span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-ink-400"
              aria-hidden="true"
            />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-600"
          aria-hidden="true"
        >
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your account and communication preferences.
          </p>
        </div>
      </header>

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsPanel />
      </Suspense>
    </div>
  );
}
