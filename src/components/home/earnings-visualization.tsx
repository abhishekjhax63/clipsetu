import { CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const POINTS = [
  "Every campaign publishes its payout rate before you shoot.",
  "Views are verified before they are counted toward a payout.",
  "Track submissions, earnings and payouts from a single dashboard.",
];

/** Illustrative worked example — never presented as a live ClipSetu figure. */
const EXAMPLE = {
  views: "240,000",
  rate: "₹45",
  payout: "₹10,800",
};

export function EarningsVisualization() {
  return (
    <section className="border-t border-border-soft bg-canvas">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Transparent payouts
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Know what every view is worth — before you post
          </h2>
          <p className="mt-4 text-base text-ink-600">
            Clipping shouldn&apos;t be a guessing game. ClipSetu puts the rate on
            the campaign, so you always know how a clip turns into money.
          </p>

          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-ink-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Example payout
            </p>

            <dl className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-ink-500">Verified clip views</dt>
                <dd className="tnum text-sm font-semibold text-ink-900">
                  {EXAMPLE.views}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-ink-500">Campaign rate</dt>
                <dd className="tnum text-sm font-semibold text-ink-900">
                  {EXAMPLE.rate} / 1K views
                </dd>
              </div>
            </dl>

            <div className="my-6 border-t border-dashed border-border" />

            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-ink-700">
                  Estimated payout
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  Released after view verification
                </p>
              </div>
              <p className="tnum text-3xl font-bold tracking-tight text-brand-700">
                {EXAMPLE.payout}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-400">
            Illustrative example. Your payout is verified views multiplied by the
            campaign rate.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
