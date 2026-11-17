import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Access denied",
  description: "You do not have permission to view this page.",
  robots: { index: false, follow: false },
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-16 text-center safe-top safe-bottom">
      <Logo className="mb-10" />
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft">
        <ShieldX className="h-7 w-7 text-danger" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">
        Access denied
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        Your account does not have permission to view this page. If you believe
        this is a mistake, please contact support from your dashboard.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
