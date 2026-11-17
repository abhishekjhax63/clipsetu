import { Compass, Scissors, Upload, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HomeStep } from "@/lib/cms";
import { ScrollReveal } from "./scroll-reveal";

const STEP_ICONS: LucideIcon[] = [Compass, Scissors, Upload, Wallet];

interface HowItWorksProps {
  steps: HomeStep[];
}

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="border-t border-border-soft bg-canvas-soft">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <ScrollReveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            From campaign to payout in four steps
          </h2>
          <p className="mt-4 text-base text-ink-600">
            No editors, no agency middlemen. Pick a campaign, publish your clip,
            and get paid on the views it actually earns.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index % STEP_ICONS.length];
            return (
              <ScrollReveal key={`${step.step}-${index}`} delay={index * 0.08}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border-soft bg-surface text-brand-700 shadow-xs">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="tnum text-sm font-semibold text-ink-300">
                      Step {step.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    {step.desc}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
