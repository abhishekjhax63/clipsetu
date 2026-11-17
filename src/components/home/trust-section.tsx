import { IndianRupee, Scale, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const PILLARS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ShieldCheck,
    title: "Verified views only",
    desc: "Inflated or duplicated views are filtered before they ever count toward a payout.",
  },
  {
    icon: IndianRupee,
    title: "Clear payout trail",
    desc: "See what you've earned, what's pending verification and what's already been paid.",
  },
  {
    icon: Scale,
    title: "Fair review on disputes",
    desc: "If something looks off, raise a dispute and our team reviews both sides of it.",
  },
  {
    icon: Sparkles,
    title: "Campaigns worth clipping",
    desc: "Brands across India, with briefs that are clear about the rate and the rules.",
  },
];

export function TrustSection() {
  return (
    <section className="border-t border-border-soft bg-canvas-soft">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <ScrollReveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Why ClipSetu
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Built for creators and brands who want fewer surprises
          </h2>
          <p className="mt-4 text-base text-ink-600">
            A clipping marketplace only works if both sides trust the numbers.
            That&apos;s the part we obsess over.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((pillar, index) => (
            <ScrollReveal key={pillar.title} delay={index * 0.06}>
              <div className="flex h-full gap-4 rounded-2xl border border-border-soft bg-surface p-6 shadow-xs">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <pillar.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
