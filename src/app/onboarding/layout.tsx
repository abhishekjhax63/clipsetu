import Link from "next/link";
import { Logo } from "@/components/layout/site-header";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas-soft">
      <header className="sticky top-0 z-40 border-b border-border-soft bg-canvas/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link
            href="/"
            className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
          >
            Exit setup
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
