"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  BadgeCheck,
  Wallet,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const PILLARS: {
  icon: LucideIcon;
  title: string;
  desc: string;
}[] = [
  {
    icon: BadgeCheck,
    title: "Verified performance",
    desc: "View counts come from official platform APIs. We never inflate or estimate engagement.",
  },
  {
    icon: Wallet,
    title: "Secure payouts",
    desc: "An append-only double-entry ledger backs every wallet transaction. Withdrawals are KYC-gated.",
  },
  {
    icon: Megaphone,
    title: "Real campaigns",
    desc: "Every campaign is funded and moderated before it goes live. No fake opportunities.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent rewards",
    desc: "Reward rules are set upfront by the brand. You always know what you'll earn per 1,000 views.",
  },
];

export function TrustSection() {
  return (
    <section className="relative overflow-hidden bg-ink-900 py-24 text-white">
      {/* ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-mint-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-mint-400">
            Built on trust
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Fair by design, verified at every step
          </h2>
          <p className="mt-4 text-ink-300">
            ClipSetu is engineered so creators and brands never have to take
            each other&apos;s word for it.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group h-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint-500/15 text-mint-400 transition-colors group-hover:bg-mint-500/25">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {p.desc}
                </p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
