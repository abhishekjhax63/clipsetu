import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export const metadata: Metadata = {
  title: "Notification preferences",
  robots: { index: false, follow: false },
};

interface PreferencesRow {
  email: boolean;
  in_app: boolean;
  marketing: boolean;
}

/** Schema defaults: email + in-app on, marketing off. */
const DEFAULT_PREFERENCES: PreferencesRow = {
  email: true,
  in_app: true,
  marketing: false,
};

async function NotificationPreferencesPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Preferences need a backend">
        Your notification preferences are stored in Supabase. Add your project
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
    .from("notification_preferences")
    .select("email, in_app, marketing")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: PreferencesRow | null };

  let preferences = data;

  // Create the row with schema defaults if it is missing.
  if (!preferences) {
    const { data: created } = (await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: user.id },
        { onConflict: "user_id", ignoreDuplicates: true }
      )
      .select("email, in_app, marketing")
      .maybeSingle()) as { data: PreferencesRow | null };
    preferences = created ?? DEFAULT_PREFERENCES;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>
          Choose how ClipSetu contacts you. Email delivery is only ever sent when
          you enable it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationPreferencesForm defaults={preferences} />
      </CardContent>
    </Card>
  );
}

function PreferencesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function NotificationPreferencesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Notification preferences
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Control which notifications you receive.
          </p>
        </div>
      </header>

      <Suspense fallback={<PreferencesSkeleton />}>
        <NotificationPreferencesPanel />
      </Suspense>
    </div>
  );
}
