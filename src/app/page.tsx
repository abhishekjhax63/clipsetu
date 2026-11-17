import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getHomeHero,
  getHomeHowItWorks,
  getHomeStats,
  getPublicCampaigns,
  safeContentHref,
  type PublicCampaign,
} from "@/lib/cms";

import { CustomCursor } from "@/components/home/custom-cursor";
import { VideoOrbit } from "@/components/home/video-orbit";
import { MagneticButton } from "@/components/home/magnetic-button";
import { RevealText } from "@/components/home/reveal-text";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { EarningsVisualization } from "@/components/home/earnings-visualization";
import { HowItWorks } from "@/components/home/how-it-works-section";
import { CampaignShowcase, type ShowcaseCampaign } from "@/components/home/campaign-showcase";
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
      <CustomCursor />

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden">
        {/* ambient backdrop */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(134,239,172,0.35),rgba(163,230,53,0.08)_45%,transparent_70%)] blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(250,250,250,0.6))]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="success"
              className="mb-6 px-4 py-1.5 text-xs animate-fade-in-up"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {hero.badge}
            </Badge>

            <RevealText
              as="h1"
              text={`${hero.title} ${hero.titleAccent}`}
              highlightLast
              className="text-5xl font-black leading-[1.02] tracking-tight text-ink-900 sm:text-7xl"
            />

            <RevealText
              as="p"
              text={hero.subtitle}
              delay={0.35}
              stagger={0.03}
              className="mx-auto mt-6 max-w-xl text-lg text-ink-600"
            />

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MagneticButton>
                <Button asChild size="lg" className="bg-ink-900 text-white hover:bg-ink-800">
                  <Link href={safeContentHref(hero.primaryCtaHref, "/signup")}>
                    Start Earning
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </MagneticButton>
              <MagneticButton strength={12}>
                <Button asChild variant="outline" size="lg">
                  <Link href="/campaigns">
                    <Play className="h-4 w-4" />
                    Explore Campaigns
                  </Link>
                </Button>
              </MagneticButton>
            </div>
          </div>

          {/* Signature video orbit */}
          <div className="mt-16 sm:mt-20">
            <VideoOrbit />
            <p className="mt-8 text-center text-xs text-ink-400">
              Illustrative sample preview — figures shown are examples, not live
              ClipSetu statistics.
            </p>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s, i) => (
              <ScrollReveal key={s.label} delay={i * 0.08}>
                <div className="rounded-2xl border border-border-soft bg-white/70 p-5 text-center shadow-sm backdrop-blur">
                  <div className="text-2xl font-bold text-ink-900 sm:text-3xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs text-ink-500">{s.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============== EARNINGS ============== */}
      <EarningsVisualization />

      {/* ============== HOW IT WORKS ============== */}
      <HowItWorks steps={steps} />

      {/* ============== CAMPAIGN SHOWCASE ============== */}
      <CampaignShowcase campaigns={showcase} />

      {/* ============== TRUST ============== */}
      <TrustSection />

      {/* ============== FINAL CTA ============== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 pt-4">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-16 text-center sm:px-12">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-mint-500/20 blur-3xl" />
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              Ready to start earning?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-ink-300">
              Create your free account and start earning from campaigns that
              match your audience — brands and creators growing together.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="bg-mint-500 text-ink-900 hover:bg-mint-400"
                >
                  <Link href="/signup">Create free account</Link>
                </Button>
              </MagneticButton>
              <MagneticButton strength={12}>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/campaigns">Browse campaigns</Link>
                </Button>
              </MagneticButton>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </PublicLayout>
  );
}
