import Image from "next/image";
import Link from "next/link";
import { Eye, ShieldCheck, Wallet } from "lucide-react";

const ASSURANCES = [
  {
    icon: Eye,
    text: "Rewards are based only on API-verified views.",
  },
  {
    icon: Wallet,
    text: "Payouts land in your bank account, in rupees.",
  },
  {
    icon: ShieldCheck,
    text: "A ledger-backed balance you can reconcile line by line.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:grid lg:grid-cols-2">
      {/* Brand panel — desktop only. Keeps the product promise in view while
          the user is deciding whether to sign up. */}
      <aside className="relative hidden overflow-hidden bg-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-grid-invert absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl"
          aria-hidden="true"
        />

        <Link
          href="/"
          aria-label="ClipSetu home"
          className="relative flex items-center gap-2.5"
        >
          <Image
            src="/brand/clipsetu-mark.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10 object-contain"
          />
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Clip<span className="text-brand-400">Setu</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
            India&apos;s clipping marketplace
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-white">
            Turn short clips into verified income.
          </h2>
          <p className="mt-4 text-ink-300">
            Join campaigns from Indian brands, publish on Instagram Reels or
            YouTube Shorts, and get paid for the views you actually earn.
          </p>
          <ul className="mt-8 space-y-3">
            {ASSURANCES.map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon
                    className="h-4 w-4 text-brand-400"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm text-ink-300">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-500">
          Built for Indian creators and brands.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        <div className="flex justify-center px-4 pt-10 lg:hidden">
          <Link
            href="/"
            aria-label="ClipSetu home"
            className="flex items-center gap-2.5"
          >
            <Image
              src="/brand/clipsetu-mark.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain"
            />
            <span className="font-display text-xl font-bold tracking-tight text-ink-900">
              Clip<span className="text-brand-600">Setu</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pb-8 text-xs text-ink-400">
          <Link href="/terms" className="hover:text-ink-700">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink-700">
            Privacy
          </Link>
          <Link href="/guidelines/community" className="hover:text-ink-700">
            Guidelines
          </Link>
          <Link href="/contact" className="hover:text-ink-700">
            Contact
          </Link>
        </div>
      </main>
    </div>
  );
}
