import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/layout/site-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/app/(auth)/actions";
import { mfaState, requireStaff } from "@/lib/admin";
import { MfaGate } from "./mfa-gate";

export const metadata: Metadata = {
  title: "Admin — ClipSetu",
  // The admin surface is never indexed and never linked from the public site.
  robots: { index: false, follow: false },
};

async function AdminShell({ children }: { children: React.ReactNode }) {
  // Redirects to /login (no session) or /unauthorized (not staff).
  const user = await requireStaff();
  const mfa = await mfaState();

  const initials = (user.fullName ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-canvas-soft">
      <header className="sticky top-0 z-40 border-b border-border-soft bg-canvas/85 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <Badge variant="outline" className="shrink-0">
              Admin
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink-900">
                {user.fullName ?? "Staff"}
              </p>
              <p className="text-xs capitalize text-ink-400">
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
            >
              {initials}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-surface-muted hover:text-ink-900"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Console
            </p>
            <AdminNav variant="sidebar" />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 lg:hidden">
            <AdminNav />
          </div>
          {mfa.enrolled && mfa.satisfied ? (
            children
          ) : (
            <MfaGate
              enrolled={mfa.enrolled}
              factorId={mfa.factorId}
              email={user.email}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
