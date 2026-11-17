import Link from "next/link";
import { Scissors } from "lucide-react";
import { PUBLIC_NAV } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-ink-900">
        <Scissors className="h-5 w-5 text-mint-400" />
        <span className="logo-sheen" aria-hidden />
      </span>
      <span className="text-xl font-bold tracking-tight text-ink-900">
        Clip<span className="text-mint-600">Setu</span>
      </span>
    </Link>
  );
}

export async function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-soft bg-canvas/80 backdrop-blur-xl safe-top">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-surface-muted hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
