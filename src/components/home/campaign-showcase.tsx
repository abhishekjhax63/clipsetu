import Link from "next/link";
import { ArrowRight, CalendarClock, Eye } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

export interface ShowcaseCampaign {
  id: string;
  brand: string;
  title: string;
  category: string | null;
  type: string;
  rewardPer1k: number;
  minViews: number;
  endDate: string | null;
  status: string;
}

interface CampaignShowcaseProps {
  campaigns: ShowcaseCampaign[];
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const shortDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

function endsIn(endDate: string | null) {
  if (!endDate) return null;
  const date = new Date(endDate);
  if (Number.isNaN(date.getTime())) return null;
  return shortDate.format(date);
}

export function CampaignShowcase({ campaigns }: CampaignShowcaseProps) {
  return (
    <section className="border-t border-border-soft bg-canvas-soft">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <ScrollReveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              Live campaigns
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Campaigns paying creators right now
            </h2>
            <p className="mt-4 text-base text-ink-600">
              Browse open briefs from brands across India. Every campaign lists
              its payout rate up front — no guessing what a view is worth.
            </p>
          </div>
          <Link
            href="/campaigns"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
          >
            Browse all campaigns
            <ArrowRight className="h-4 w-4" />
          </Link>
        </ScrollReveal>

        {campaigns.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
            <p className="text-sm font-medium text-ink-700">
              New campaigns are being set up.
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Create an account to get notified the moment a brief goes live.
            </p>
          </div>
        ) : (
          <div className="no-scrollbar mt-12 -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {campaigns.map((campaign, index) => {
              const ends = endsIn(campaign.endDate);
              return (
                <ScrollReveal
                  key={campaign.id}
                  delay={index * 0.06}
                  className="w-[280px] shrink-0 snap-start sm:w-auto"
                >
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-border-soft bg-surface p-5 shadow-xs transition-colors hover:border-brand-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900 text-sm font-bold text-white">
                        {campaign.brand.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {campaign.brand}
                        </p>
                        <p className="truncate text-xs text-ink-400">
                          {campaign.category ?? campaign.type}
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-4 line-clamp-2 text-base font-semibold leading-snug text-ink-900 group-hover:text-brand-800">
                      {campaign.title}
                    </h3>

                    <div className="mt-auto pt-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="tnum text-xl font-bold text-brand-700">
                          {inr.format(campaign.rewardPer1k)}
                        </span>
                        <span className="text-xs text-ink-400">/ 1K views</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          <span className="tnum">
                            min {compact.format(campaign.minViews)} views
                          </span>
                        </span>
                        {ends ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            ends {ends}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
