import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/site-header";
import {
  DashboardBottomNav,
  DashboardNav,
} from "@/components/layout/dashboard-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";

async function MainNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>
      <DashboardNav role={user.role} />
      <DashboardBottomNav role={user.role} />
    </>
  );
}

async function UserArea() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-muted"
      >
        Log in
      </Link>
    );
  }

  const initials = (user.fullName ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight text-ink-900">
          {user.fullName ?? "Account"}
        </p>
        <p className="text-xs capitalize text-ink-400">
          {user.role.replace("_", " ")}
        </p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-surface-muted hover:text-ink-900"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas-soft">
      <header className="sticky top-0 z-40 border-b border-border-soft bg-canvas/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <Suspense
              fallback={<Skeleton className="hidden h-9 w-64 rounded-full md:block" />}
            >
              <MainNav />
            </Suspense>
          </div>
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-full" />}>
            <UserArea />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pt-10 md:pb-10">
        {children}
      </main>
    </div>
  );
}
