import Link from "next/link";
import { ArrowRight, ShieldCheck, TrendingUp, DollarSign, BarChart3, Eye, Users } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Eye,
    title: "Pay only for verified views",
    desc: "Every rupee is backed by official platform API data. No inflated numbers, no fake engagement.",
  },
  {
    icon: DollarSign,
    title: "Transparent pricing",
    desc: "Set your own budget and reward per 1,000 views. No hidden fees, no minimum spend surprises.",
  },
  {
    icon: ShieldCheck,
    title: "Fraud protection",
    desc: "Duplicate detection, abnormal growth alerts, and manual review keep your budget safe.",
  },
  {
    icon: Users,
    title: "Approve every submission",
    desc: "Review clips before they count. Approve, reject, or request revisions with full control.",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    desc: "Track views, submissions, spend, and ROI across all your campaigns in one dashboard.",
  },
  {
    icon: TrendingUp,
    title: "Scale your reach",
    desc: "Harness the creator economy. Hundreds of creators amplifying your brand authentically.",
  },
];

export default function ForBrandsPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <Badge variant="success" className="mb-6">For Brands</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Authentic creator content.{" "}
          <span className="gradient-text-brand">Verified results.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
          Launch UGC and clipping campaigns that reach real audiences. Pay only
          for verified views, with full control over every submission.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Launch a campaign
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border-soft bg-surface p-6 shadow-xs transition-colors hover:border-brand-200"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
                <f.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { value: "10%", label: "Flat platform fee, disclosed upfront" },
            { value: "₹100", label: "Minimum withdrawal amount" },
            { value: "INR", label: "Settlement currency" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border-soft bg-surface-soft p-8 text-center"
            >
              <div className="font-display tnum text-4xl font-bold tracking-tight text-ink-900">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-ink-500">{s.label}</div>
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
              Launch your first campaign today
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-300">
              No setup fees. Pay only when verified views come in.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 bg-brand-500 text-white hover:bg-brand-400"
            >
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
