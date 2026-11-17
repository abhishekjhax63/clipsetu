"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PUBLIC_NAV } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="ClipSetu home"
      className={`group flex items-center gap-2.5 ${className}`}
    >
      <Image
        src="/brand/clipsetu-mark.png"
        alt=""
        width={36}
        height={36}
        priority
        className="h-9 w-9 object-contain"
      />
      <span className="text-[19px] font-bold tracking-tight text-ink-900">
        Clip<span className="text-brand-600">Setu</span>
      </span>
    </Link>
  );
}

/**
 * Desktop navigation. Reads `usePathname()` for the active state, so it sits
 * behind a Suspense boundary — that keeps every static route prerenderable.
 */
function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 lg:flex">
      {PUBLIC_NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors ${
              active ? "text-ink-900" : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);

  // Lock scroll and wire Escape while the sheet is open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-soft bg-canvas/85 backdrop-blur-md safe-top">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <React.Suspense
          fallback={
            <nav
              aria-hidden="true"
              className="hidden items-center gap-7 lg:flex"
            >
              {PUBLIC_NAV.map((item) => (
                <span
                  key={item.href}
                  className="text-sm font-medium text-ink-600"
                >
                  {item.label}
                </span>
              ))}
            </nav>
          }
        >
          <DesktopNav />
        </React.Suspense>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/signup">Get started</Link>
          </Button>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-surface-muted lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-30 bg-ink-950/25"
          />
          <div className="absolute inset-x-0 top-full z-40 origin-top border-b border-border-soft bg-canvas px-4 pb-6 pt-2 shadow-lg animate-fade-in">
            <nav className="flex flex-col">
              {PUBLIC_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-3 text-[15px] font-medium text-ink-800 transition-colors hover:bg-surface-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button asChild variant="secondary">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button asChild>
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
