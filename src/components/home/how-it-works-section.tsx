"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, Scissors, Send, Wallet, type LucideIcon } from "lucide-react";
import type { HomeStep } from "@/lib/cms";
import { ScrollReveal } from "./scroll-reveal";

const STEP_ICONS: LucideIcon[] = [Search, Scissors, Send, Wallet];

interface HowItWorksProps {
  steps: HomeStep[];
}

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-mint-700">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Four steps from idea to income
          </h2>
          <p className="mt-4 text-ink-600">
            A transparent flow — no hidden fees, no fake engagement.
          </p>
        </ScrollReveal>

        {/* Connected timeline */}
        <div className="relative mt-16">
          {/* Horizontal connector (desktop) */}
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? Search;
              return (
                <ScrollReveal key={`${step.step}-${i}`} delay={i * 0.12}>
                  <div className="relative flex flex-col items-center text-center md:items-start md:text-left">
                    {/* Step number + icon */}
                    <div className="relative z-10 mb-5">
                      <motion.div
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-ink-900/5 ring-1 ring-border-soft"
                      >
                        <Icon className="h-7 w-7 text-mint-600" />
                      </motion.div>
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-ink-900">
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
      </div>
    </section>
  );
}
