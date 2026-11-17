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
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <Badge variant="secondary" className="mb-6">For Brands</Badge>
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

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl gradient-earn-soft">
                <f.icon className="h-5 w-5 text-mint-700" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { value: "10%", label: "Flat platform fee, disclosed upfront" },
            { value: "₹100", label: "Minimum withdrawal amount" },
            { value: "INR", label: "Settlement currency" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border-soft bg-surface p-8 text-center shadow-sm"
            >
              <div className="text-4xl font-bold text-ink-900">{s.value}</div>
              <div className="mt-2 text-sm text-ink-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl bg-ink-900 p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Launch your first campaign today
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-300">
            No setup fees. Pay only when verified views come in.
          </p>
          <Button asChild size="lg" className="mt-6 bg-mint-500 text-ink-900 hover:bg-mint-400">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
