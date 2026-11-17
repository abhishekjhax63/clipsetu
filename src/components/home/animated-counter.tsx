"use client";

import * as React from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { usePrefersReducedMotion } from "./hooks";

interface AnimatedCounterProps {
  to: number;
  duration?: number;
  /** Render the current numeric value however you like. */
  format?: (value: number) => string;
  className?: string;
  /** Label shown as a small caption, e.g. "Sample data". */
  caption?: string;
}

/**
 * Counts up from 0 to `to` when scrolled into view. The caller formats the
 * number (currency, compact, etc.). Respects prefers-reduced-motion by jumping
 * straight to the final value.
 */
export function AnimatedCounter({
  to,
  duration = 1.6,
  format = (v) => Math.round(v).toString(),
  className,
  caption,
}: AnimatedCounterProps) {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => format(latest));

  React.useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(count, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, to, duration, count, reduced]);

  return (
    <span ref={ref} className={className}>
      <motion.span>{rounded}</motion.span>
      {caption ? (
        <span className="ml-2 text-xs font-normal text-ink-400">{caption}</span>
      ) : null}
    </span>
  );
}
