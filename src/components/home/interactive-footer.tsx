"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useMediaQuery, usePrefersReducedMotion } from "./hooks";

const WORD = "ClipSetu";

const footerLinks = {
  Platform: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Campaigns", href: "/campaigns" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQ", href: "/faq" },
  ],
  ForCreators: [
    { label: "For Clippers", href: "/for-clippers" },
    { label: "Creator Guidelines", href: "/guidelines/creator" },
    { label: "Help Centre", href: "/help" },
  ],
  ForBrands: [
    { label: "For Brands", href: "/for-brands" },
    { label: "Brand Guidelines", href: "/guidelines/brand" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Cookies", href: "/cookies" },
    { label: "Payments & Refunds", href: "/payments" },
  ],
};

function MagneticLetter({
  ch,
  index,
  total,
  smx,
  smy,
  strength,
  interactive,
}: {
  ch: string;
  index: number;
  total: number;
  smx: MotionValue<number>;
  smy: MotionValue<number>;
  strength: number;
  interactive: boolean;
}) {
  const center = (index + 0.5) / total;
  const dx = useTransform(smx, (x) => (x - center) * strength);
  const dy = useTransform(smy, (y) => (y - 0.5) * strength);

  return (
    <motion.span
      style={interactive ? { x: dx, y: dy } : undefined}
      className="inline-block bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent"
    >
      {ch}
    </motion.span>
  );
}

function MagneticWordmark() {
  const reduced = usePrefersReducedMotion();
  const isFine = useMediaQuery("(pointer: fine)");
  const interactive = isFine && !reduced;

  const ref = React.useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const smx = useSpring(mx, { stiffness: 120, damping: 20 });
  const smy = useSpring(my, { stiffness: 120, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  const letters = WORD.split("");
  const strength = 14; // px max displacement

  // Always compute the gradient transform (hooks rule); apply only when interactive.
  const gradientBg = useTransform(
    [smx, smy],
    ([x, y]: number[]) =>
      `radial-gradient(400px circle at ${x * 100}% ${y * 100}%, rgba(134,239,172,0.28), rgba(163,230,53,0.08) 40%, transparent 70%)`
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      className="relative select-none overflow-hidden text-center"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Gradient light following cursor */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={interactive ? { background: gradientBg } : undefined}
      />

      <h2 className="relative text-[18vw] font-black leading-[0.85] tracking-tighter sm:text-[16vw] lg:text-[14rem]">
        {letters.map((ch, i) => (
          <MagneticLetter
            key={`${ch}-${i}`}
            ch={ch}
            index={i}
            total={letters.length}
            smx={smx}
            smy={smy}
            strength={strength}
            interactive={interactive}
          />
        ))}
      </h2>
    </motion.div>
  );
}

const noopSubscribe = () => () => {};

/**
 * Current year read only on the client. Server snapshot is fixed so prerendering
 * never touches the clock.
 */
function useCurrentYear() {
  return useSyncExternalStore(
    noopSubscribe,
    () => new Date().getFullYear(),
    () => 2026
  );
}

export function InteractiveFooter() {
  const year = useCurrentYear();

  return (
    <footer className="relative overflow-hidden bg-ink-900 text-white">
      {/* Top wordmark band */}
      <div className="border-b border-white/10 px-4 py-16 sm:py-20">
        <MagneticWordmark />
        <p className="mx-auto mt-6 max-w-xl text-center text-sm text-ink-400">
          Create. Clip. Publish. Earn. — India&apos;s creator-powered clipping
          marketplace.
        </p>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <span className="text-lg">✂</span>
              </span>
              <span className="text-xl font-bold tracking-tight">
                Clip<span className="text-mint-400">Setu</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-ink-400">
              India&apos;s creator-powered clipping marketplace. Create. Clip.
              Publish. Earn.
            </p>
            <div className="mt-5 flex gap-3">
              {["Instagram", "YouTube", "X", "LinkedIn"].map((s) => (
                <span
                  key={s}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xs text-ink-300 transition-colors hover:border-mint-400/50 hover:text-mint-400"
                >
                  {s[0]}
                </span>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-white">{group}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-sm text-ink-400 transition-colors hover:text-white"
                    >
                      <span className="relative">
                        {link.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-mint-400 transition-all duration-300 group-hover:w-full" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-ink-400">
            © {year} ClipSetu. All rights reserved.
          </p>
          <p className="text-xs text-ink-400">Made in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}
