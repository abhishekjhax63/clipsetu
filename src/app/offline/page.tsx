import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "You're offline",
  description: "ClipSetu could not reach the network.",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback shown by the service worker (public/sw.js) when a navigation
 * request fails. Kept fully static so it can be served from the cache.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-16 text-center safe-top safe-bottom">
      <Logo className="mb-10" />
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted">
        <WifiOff className="h-7 w-7 text-ink-500" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-900">
        You&apos;re offline
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        ClipSetu needs a connection to load campaigns, submissions and payments.
        Check your network and try again — anything you had open will be
        available once you&apos;re back online.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Retry</Link>
        </Button>
      </div>
    </div>
  );
}
