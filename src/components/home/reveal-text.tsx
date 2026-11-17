"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { usePrefersReducedMotion } from "./hooks";

interface RevealTextProps {
  text: string;
  className?: string;
  /** Delay before starting, in seconds. */
  delay?: number;
  /** Stagger between words in seconds. */
  stagger?: number;
  /** Highlight the last word with the brand gradient. */
  highlightLast?: boolean;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
}

const container = {
  hidden: {},
  show: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
};

const word = {
  hidden: { opacity: 0, y: "0.6em" },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/**
 * Word-by-word reveal animation. Triggers once when scrolled into view.
 * Respects prefers-reduced-motion (renders statically).
 */
export function RevealText({
  text,
  className,
  delay = 0,
  stagger = 0.08,
  highlightLast = false,
  as = "div",
}: RevealTextProps) {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  const words = text.split(" ");

  if (reduced) {
    const Comp = as as React.ElementType;
    return <Comp className={className}>{text}</Comp>;
  }

  const Comp = motion[as] as typeof motion.div;

  return (
    <Comp
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      variants={container}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      custom={stagger}
      transition={{ delayChildren: delay }}
    >
      {words.map((w, i) => {
        const isLast = i === words.length - 1;
        return (
          <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              variants={word}
              className={`inline-block ${
                highlightLast && isLast ? "gradient-text-brand" : ""
              }`}
            >
              {w}
              {i < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          </span>
        );
      })}
    </Comp>
  );
}
