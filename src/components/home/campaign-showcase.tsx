"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  IndianRupee,
  Clock,
  Megaphone,
  Eye,
} from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { formatINR, formatDate } from "@/lib/utils";

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

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  scheduled: "Scheduled",
};

export function CampaignShowcase({ campaigns }: CampaignShowcaseProps) {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-mint-700">
              Live opportunities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Campaigns you can join today
            </h2>
            <p className="mt-4 text-ink-600">
              Browse active campaigns from brands across India. Every reward is
              backed by a funded budget.
            </p>
          </div>
          <Link
            href="/campaigns"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900 hover:text-mint-700"
          >
            View all campaigns
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </ScrollReveal>

        {campaigns.length === 0 ? (
          <ScrollReveal delay={0.1} className="mt-14">
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface-soft px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-100">
                <Megaphone className="h-8 w-8 text-mint-600" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink-900">
                No live campaigns yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-ink-500">
                Brands launch campaigns every week. Check back soon, or sign up
                to get notified when new opportunities go live.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white hover:bg-ink-800"
              >
                Get notified
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>
        ) : (
          <div className="mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {campaigns.map((c, i) => (
              <ScrollReveal key={c.id} delay={i * 0.08} className="snap-start shrink-0">
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="group flex w-[300px] flex-col rounded-2xl border border-border-soft bg-white p-6 shadow-sm transition-shadow hover:shadow-xl sm:w-[340px]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-earn-soft text-base font-bold text-mint-700">
                        {c.brand.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs text-ink-500">{c.brand}</p>
                        <p className="text-sm font-semibold text-ink-900">
                          {c.title}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-mint-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-mint-700">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>

                  {c.category ? (
                    <span className="mt-4 inline-flex w-fit rounded-full border border-border-soft px-2.5 py-1 text-[11px] text-ink-500">
                      {c.category}
                    </span>
                  ) : null}

                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-ink-400">
                        <IndianRupee className="h-3 w-3" /> Reward / 1K views
                      </p>
                      <p className="mt-0.5 font-bold text-ink-900">
                        {formatINR(c.rewardPer1k, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-ink-400">
                        <Eye className="h-3 w-3" /> Min. views
                      </p>
                      <p className="mt-0.5 font-bold text-ink-900">
                        {c.minViews.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {c.endDate ? (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-ink-500">
                      <Clock className="h-3.5 w-3.5" />
                      Ends {formatDate(c.endDate)}
                    </div>
                  ) : null}

                  <Link
                    href={`/campaigns/${c.id}`}
                    className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
                  >
                    View campaign
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
