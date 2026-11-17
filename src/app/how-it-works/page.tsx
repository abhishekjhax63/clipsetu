import Link from "next/link";
import { ArrowRight, Wallet, Play, TrendingUp, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    step: "01",
    title: "Brand launches a campaign",
    desc: "Brands set their budget, reward per 1,000 views, content guidelines, and eligible platforms. Once funded and reviewed, the campaign goes live.",
    icon: TrendingUp,
  },
  {
    step: "02",
    title: "Creator joins & downloads materials",
    desc: "Creators browse the marketplace, join eligible campaigns, and download source videos, logos, and brand guidelines.",
    icon: Play,
  },
  {
    step: "03",
    title: "Clip & publish on social media",
    desc: "Creators produce clips from source material and publish on Instagram Reels or YouTube Shorts, following campaign guidelines.",
    icon: Play,
  },
  {
    step: "04",
    title: "Submit the post URL",
    desc: "Submit the published post URL. We validate the URL, confirm ownership, and queue it for verification.",
    icon: ShieldCheck,
  },
  {
    step: "05",
    title: "Views verified via official APIs",
    desc: "We retrieve view counts through official platform APIs. No scraping, no fake numbers. Every view is verified.",
    icon: ShieldCheck,
  },
  {
    step: "06",
    title: "Rewards released to wallet",
    desc: "Eligible views ÷ 1,000 × reward rate = your earnings. Rewards are credited to your wallet and can be withdrawn to your bank account.",
    icon: Wallet,
  },
];

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <Badge variant="success" className="mb-6">How It Works</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          From campaign to payout in 6 steps
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
          A transparent, verified flow that ensures brands only pay for real
          views and creators get paid fairly.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="space-y-4">
          {steps.map((item) => (
            <div
              key={item.step}
              className="flex flex-col gap-4 rounded-2xl border border-border-soft bg-surface p-6 shadow-sm sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="flex items-center gap-4 sm:w-48 sm:shrink-0">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl gradient-earn-soft shrink-0">
                  <item.icon className="h-6 w-6 text-mint-700" />
                </span>
                <span className="text-3xl font-bold text-ink-100">
                  {item.step}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-ink-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl gradient-earn p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
            Ready to start clipping?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-800/80">
            Start earning from verified views.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-ink-900 text-white hover:bg-ink-800">
              <Link href="/signup">
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/campaigns">Browse campaigns</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
