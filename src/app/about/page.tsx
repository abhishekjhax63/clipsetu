import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  Heart,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { APP_BRAND, APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "ClipSetu is India-first: a creator clipping marketplace built on verified views, ledger-backed payments and human moderation.",
};

const differentiators = [
  {
    icon: Eye,
    title: "Verified views only",
    desc: "View counts are retrieved through official platform APIs. We never scrape numbers or inflate stats, so brands pay only for genuine attention.",
  },
  {
    icon: ShieldCheck,
    title: "No fake engagement",
    desc: "Bought views, bot traffic and incentivised interactions are prohibited. Suspicious activity is reviewed and reversed before rewards are confirmed.",
  },
  {
    icon: Wallet,
    title: "Ledger-backed payments",
    desc: "Every rupee in and out is recorded in a double-entry ledger. Balances, rewards and payouts reconcile to a single source of truth.",
  },
  {
    icon: Scale,
    title: "Human moderation",
    desc: "Real people review submissions, briefs and disputes. Automated checks help, but judgement calls stay with a trained moderation team.",
  },
];

const values = [
  {
    icon: Scale,
    title: "Fairness",
    desc: "Reward rules are fixed when a campaign launches. Everyone plays by the same published terms.",
  },
  {
    icon: Eye,
    title: "Transparency",
    desc: "Campaign budgets, reward rates, fees and payout timelines are visible up front — no hidden deductions.",
  },
  {
    icon: Heart,
    title: "Creator-first",
    desc: "Creators keep the majority of what their work earns, and get clear reasons whenever something is not approved.",
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center sm:px-6 lg:px-8">
        <Badge variant="success" className="mb-6">
          About ClipSetu
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          India&apos;s creator clipping marketplace
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
          ClipSetu connects Indian brands with a nationwide network of creators.
          Brands publish clips-ready source material; creators turn it into
          short-form video and earn from the verified views they attract.
        </p>
        <p className="mx-auto mt-4 text-base font-semibold text-ink-900">
          {APP_TAGLINE}
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border-soft bg-surface p-8 shadow-xs sm:p-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-ink-900">Our mission</h2>
          </div>
          <p className="mt-4 text-ink-600 leading-relaxed">
            {APP_BRAND}. We believe earning from social video should be
            simple, honest and accessible — not reserved for creators with large
            followings or agency representation. ClipSetu gives any eligible
            creator a transparent way to earn from brand campaigns, and gives
            brands a measurable way to reward real, verified attention.
          </p>
          <p className="mt-4 text-ink-600 leading-relaxed">
            Our model is built for India: rewards in rupees, payouts to local
            bank accounts, GST-aware invoicing and eligibility rules that reflect
            Indian law.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            How ClipSetu is different
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-600">
            We designed the platform around a few non-negotiables.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {differentiators.map((item) => (
            <Card key={item.title}>
              <CardContent className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
                  <item.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            What we stand for
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-2xl border border-border-soft bg-surface-soft p-6"
            >
              <value.icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-ink-900">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {value.desc}
              </p>
            </div>
          ))}
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
              Start creating — or start a campaign
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-300">
              Join as a creator to earn from verified views, or launch a campaign
              to reach India&apos;s clipping community.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-brand-500 text-white hover:bg-brand-400"
              >
                <Link href="/signup">
                  Create free account
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/campaigns">Browse campaigns</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
