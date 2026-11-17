import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTicketForm } from "./new-ticket-form";

export const metadata: Metadata = {
  title: "New support ticket",
  robots: { index: false, follow: false },
};

async function NewTicketPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Support needs a backend">
        Support tickets are stored in Supabase. Add your project credentials and
        apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to open a ticket.
      </SetupNotice>
    );
  }

  await requireAuth();

  return <NewTicketForm />;
}

export default function NewTicketPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to support
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Open a support ticket
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Tell us what you need help with. Our team typically responds within 2
          business days.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <NewTicketPanel />
      </Suspense>
    </div>
  );
}
