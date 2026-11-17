import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import {
  getHomeHero,
  getHomeHowItWorks,
  getHomeStats,
  getPublicCampaigns,
  safeContentHref,
  type PublicCampaign,
} from "@/lib/cms";

import { HeroPreview } from "@/components/home/hero-preview";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { EarningsVisualization } from "@/components/home/earnings-visualization";
import { HowItWorks } from "@/components/home/how-it-works-section";
import {
  CampaignShowcase,
  type ShowcaseCampaign,
} from "@/components/home/campaign-showcase";
import { TrustSection } from "@/components/home/trust-section";
import { InteractiveFooter } from "@/components/home/interactive-footer";

function toShowcase(c: PublicCampaign): ShowcaseCampaign {
  return {
    id: c.id,
    brand: c.brand,
    title: c.title,
    category: c.category,
    type: c.type,
    rewardPer1k: c.reward_per_1k_views,
    minViews: c.min_views,
    endDate: c.end_date,
    status: c.status,
  };
}

function AudienceCard({
  eyebrow,
  title,
  points,
  href,
  cta,
  tone,
}: {
  eyebrow: string;
  title: string;
  points: string[];
  href: string;
  cta: string;
  tone: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      className={
        dark
          ? "flex flex-col rounded-2xl bg-ink-900 p-7 text-white sm:p-9"
          : "flex flex-col rounded-2xl border border-border-soft bg-surface p-7 shadow-xs sm:p-9"
      }
    >
      <p
        className={
          dark
            ? "text-xs font-semibold uppercase tracking-[0.16em] text-brand-400"
            : "text-xs font-semibold uppercase tracking-[0.16em] text-brand-700"
        }
      >
        {eyebrow}
      </p>
      <h3
        className={
          dark
            ? "mt-3 text-2xl font-bold tracking-tight"
            : "mt-3 text-2xl font-bold tracking-tight text-ink-900"
        }
      >
        {title}
      </h3>
      <ul className="mt-6 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-sm">
            <Check
              className={
                dark
                  ? "mt-0.5 h-4 w-4 shrink-0 text-brand-400"
                  : "mt-0.5 h-4 w-4 shrink-0 text-brand-600"
              }
            />
            <span className={dark ? "text-ink-300" : "text-ink-600"}>
              {point}
            </span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        variant={dark ? "secondary" : "outline"}
        className={
          dark
            ? "mt-8 self-start border-0 bg-white text-ink-900 hover:bg-ink-100"
            : "mt-8 self-start"
        }
      >
        <Link href={href}>
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default async function HomePage() {
  const [hero, stats, steps, campaigns] = await Promise.all([
    getHomeHero(),
    getHomeStats(),
    getHomeHowItWorks(),
    getPublicCampaigns(6),
  ]);

  const showcase = campaigns.map(toShowcase);

  return (
    <PublicLayout footer={<InteractiveFooter />}>
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-600 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {hero.badge}
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 sm:text-[3.5rem]">
              {hero.title}{" "}
              <span className="text-brand-600">{hero.titleAccent}</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg text-ink-600">
              {hero.subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link
                  href={safeContentHref(hero.primaryCtaHref, "/signup")}
                >
                  {hero.primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link
                  href={safeContentHref(hero.secondaryCtaHref, "/how-it-works")}
                >
                  <Play className="h-4 w-4" />
                  {hero.secondaryCtaLabel}
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-ink-400">
              Free to join · No subscription · Payouts on verified views
            </p>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* ============== STATS ============== */}
      <section className="border-y border-border-soft bg-canvas-soft">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((stat, index) => (
            <ScrollReveal key={stat.label} delay={index * 0.06}>
              <div>
                <p className="tnum text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-sm text-ink-500">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <HowItWorks steps={steps} />

      {/* ============== LIVE CAMPAIGNS ============== */}
      <CampaignShowcase campaigns={showcase} />

      {/* ============== EARNINGS ============== */}
      <EarningsVisualization />

      {/* ============== AUDIENCES ============== */}
      <section className="border-t border-border-soft bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              One platform, two ways in
            </h2>
            <p className="mt-4 text-base text-ink-600">
              Whether you edit for a living or you&apos;re trying to get your
              product in front of more people, the workflow is the same — just
              from opposite ends.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <ScrollReveal>
              <AudienceCard
                eyebrow="For clippers"
                title="Get paid for the edits you already make"
                points={[
                  "Find open campaigns by niche, platform and payout rate.",
                  "Submit clips and track views and earnings in one place.",
                  "Withdraw once your views clear verification.",
                ]}
                href="/for-clippers"
                cta="Start clipping"
                tone="dark"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <AudienceCard
                eyebrow="For brands"
                title="Turn creator clips into reach you can measure"
                points={[
                  "Launch a brief with your payout rate and creative rules.",
                  "Review submissions and approve the ones that fit.",
                  "Only pay for the verified views your campaign earns.",
                ]}
                href="/for-brands"
                cta="Launch a campaign"
                tone="light"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ============== TRUST ============== */}
      <TrustSection />

      {/* ============== FINAL CTA ============== */}
      <section className="bg-canvas-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-16 text-center sm:px-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(31,135,103,0.45),transparent_62%)]"
              />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Ready to start earning?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-ink-300">
                  Create a free account, pick a campaign that fits your audience,
                  and start turning clips into income.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="bg-brand-500 text-white hover:bg-brand-400"
                  >
                    <Link href="/signup">
                      Create free account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Link href="/campaigns">Browse campaigns</Link>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </PublicLayout>
  );
}
