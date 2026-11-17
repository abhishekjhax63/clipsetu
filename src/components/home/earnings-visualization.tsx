"use client";

import { motion } from "framer-motion";
import { IndianRupee, Eye, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./animated-counter";
import { ScrollReveal } from "./scroll-reveal";
import { formatINR } from "@/lib/utils";

/**
 * Premium earnings visualization. The numbers are a transparent, explicitly
 * labelled illustrative demo of how the reward engine works (views × per-1k
 * rate). They are NOT real platform statistics.
 */
export function EarningsVisualization() {
  const rewardPer1k = 20; // ₹20 per 1,000 verified views (illustrative)
  const views = 1_250_000;
  const earnings = Math.round((views / 1000) * rewardPer1k);

  return (
    <section className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-mint-700">
            Transparent rewards
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Earn for every verified view
          </h2>
          <p className="mt-4 text-ink-600">
            Rewards are calculated from verified platform data — no guesswork.
            Here&apos;s how a single high-performing clip performs.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="mt-14">
          <div className="relative overflow-hidden rounded-3xl border border-border-soft bg-white p-8 shadow-lg sm:p-12">
            {/* glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-mint-200/40 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              {/* Big counter */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-ink-500">
                  <TrendingUp className="h-4 w-4 text-mint-600" />
                  Estimated earnings from this clip
                </div>
                <div className="mt-3 flex items-baseline gap-1 text-ink-900">
                  <IndianRupee className="h-10 w-10 sm:h-12 sm:w-12" />
                  <AnimatedCounter
                    to={earnings}
                    duration={2}
                    format={(v) =>
                      formatINR(Math.round(v), {
                        maximumFractionDigits: 0,
                      }).replace("₹", "")
                    }
                    className="text-5xl font-black tracking-tight sm:text-7xl"
                  />
                </div>
                <p className="mt-2 text-xs text-ink-400">
                  Illustrative example — not a live creator&apos;s earnings.
                </p>

                <div className="mt-6 flex flex-wrap gap-6">
                  <div className="flex items-center gap-2 text-sm text-ink-600">
                    <Eye className="h-4 w-4 text-mint-600" />
                    <AnimatedCounter
                      to={views}
                      duration={2}
                      format={(v) =>
                        `${(v / 1000).toFixed(0)}K`
                      }
                      className="font-bold text-ink-900"
                    />
                    <span>verified views</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-600">
                    <IndianRupee className="h-4 w-4 text-mint-600" />
                    <span className="font-bold text-ink-900">
                      {rewardPer1k}
                    </span>
                    <span>per 1,000 views</span>
                  </div>
                </div>
              </div>

              {/* Progression bars */}
              <div className="space-y-5">
                {[
                  { label: "First 100K views", value: 100_000, earned: 2_000 },
                  { label: "500K views", value: 500_000, earned: 10_000 },
                  { label: "1M views", value: 1_000_000, earned: 20_000 },
                  { label: "1.25M views (this clip)", value: 1_250_000, earned: 25_000, highlight: true },
                ].map((row, i) => {
                  const pct = Math.round((row.value / views) * 100);
                  return (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span
                          className={
                            row.highlight
                              ? "font-semibold text-ink-900"
                              : "text-ink-600"
                          }
                        >
                          {row.label}
                        </span>
                        <span className="font-mono text-xs text-ink-500">
                          ₹{row.earned.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                        <motion.div
                          className="h-full rounded-full gradient-earn"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 1,
                            delay: 0.2 + i * 0.1,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
