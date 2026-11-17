import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText } from "lucide-react";
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
import { ContentForm } from "./content-form";

export const metadata: Metadata = {
  title: "Site content — Admin",
  robots: { index: false, follow: false },
};

interface ContentRow {
  key: string;
  value: unknown;
  description: string | null;
  status: string;
  updated_at: string;
}

async function ContentInner() {
  await requireAdmin();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Site content needs a backend">
        Content is stored in Supabase. Add your project credentials and run the
        migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        (including the seed) to edit the live homepage, help centre and system
        announcement.
      </SetupNotice>
    );
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("cms_content")
    .select("key, value, description, status, updated_at")
    .order("key", { ascending: true });

  const rows = (data ?? []) as ContentRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Site content
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Homepage copy, help-centre topics and the site-wide announcement.
          Values are stored as JSON and published instantly.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content found"
          description="Run the seed migration in supabase/migrations to create the default site content."
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
                    {row.status === "published" ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
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
                <ContentForm
                  contentKey={row.key}
                  valueJson={JSON.stringify(row.value, null, 2)}
                  status={row.status}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ContentInner />
    </Suspense>
  );
}
