import type { Metadata } from "next";
import { Suspense } from "react";
import { Settings } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { SettingForm } from "./setting-form";

export const metadata: Metadata = {
  title: "Platform settings — Admin",
  robots: { index: false, follow: false },
};

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
  is_sensitive: boolean;
  updated_at: string;
}

async function SettingsInner() {
  const actor = await requireAdmin();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Platform settings need a backend">
        Settings are stored in Supabase. Add your project credentials and run the
        migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        (including the seed) to manage live configuration.
      </SetupNotice>
    );
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value, description, is_sensitive, updated_at")
    .order("key", { ascending: true });

  const rows = (data ?? []) as SettingRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Platform settings
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Runtime configuration. Values are stored as JSON.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="No settings found"
          description="Run the seed migration in supabase/migrations to create the default platform settings."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.key}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-surface-muted px-1.5 py-0.5 text-sm">
                      {row.key}
                    </code>
                    {row.is_sensitive ? (
                      <Badge variant="warning">Sensitive</Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {row.description ?? "No description."}
                  </CardDescription>
                </div>
                <span className="shrink-0 text-xs text-ink-400">
                  Updated {formatDate(row.updated_at)}
                </span>
              </CardHeader>
              <CardContent>
                <SettingForm
                  settingKey={row.key}
                  valueJson={JSON.stringify(row.value, null, 2)}
                  disabled={
                    row.is_sensitive && actor.role !== "super_admin"
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsInner />
    </Suspense>
  );
}
