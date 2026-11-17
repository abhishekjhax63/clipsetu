import Link from "next/link";
import { ArrowRight, Wallet, Play, ShieldCheck, TrendingUp, Clock, IndianRupee } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const benefits = [
  {
    icon: IndianRupee,
    title: "Earn per 1,000 verified views",
    desc: "Set your own earning potential. The more views your clips get, the more you earn.",
  },
  {
    icon: Play,
    title: "Work with top brands",
    desc: "Access campaigns from leading brands across India. Choose what fits your style.",
  },
  {
    icon: Wallet,
    title: "Fast withdrawals",
    desc: "Withdraw your earnings to your bank account. Low minimum withdrawal threshold.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & transparent",
    desc: "Every view is verified through official APIs. No hidden cuts, no fake numbers.",
  },
  {
    icon: Clock,
    title: "Flexible schedule",
    desc: "Create on your own time. Join campaigns whenever you want, no fixed hours.",
  },
  {
    icon: TrendingUp,
    title: "Grow your audience",
    desc: "Work with brands that align with your content. Build real partnerships.",
  },
];

export default function ForClippersPage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-100/60 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
          <Badge variant="success" className="mb-6">For Creators</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Turn your clips into{" "}
            <span className="gradient-text-brand">real income</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
            Join campaigns from top brands, publish your best clips, and get
            paid for every verified view. No minimum follower requirement on
            most campaigns.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start creating
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/campaigns">Browse campaigns</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-border-soft bg-surface p-6 shadow-xs transition-colors hover:border-brand-200"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
                <b.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-900">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-8 text-center sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              How earnings work
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-300">
              Simple, transparent formula based on verified views.
            </p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="font-mono text-base text-white sm:text-lg">
                (Eligible views ÷ 1,000) × Campaign reward rate = Your earnings
              </p>
            </div>
            <p className="mt-4 text-sm text-ink-400">
              Example: 50,000 verified views × ₹80 per 1K = ₹4,000 earnings
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-8 text-center sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Start earning on ClipSetu
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-300">
              Free to join. No hidden fees. Earn from your first verified view.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 bg-brand-500 text-white hover:bg-brand-400"
            >
              <Link href="/signup">Create free account</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
