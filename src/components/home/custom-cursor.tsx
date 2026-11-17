"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useMediaQuery, usePrefersReducedMotion } from "./hooks";

/**
 * Desktop-only custom cursor: a small lime dot that follows the pointer with
 * spring smoothing, plus a soft lime spotlight. Interactive elements (matched
 * via the selector below or an explicit `[data-cursor]` attribute) enlarge the
 * dot and shift its colour.
 *
 * - Disabled on touch / coarse pointers.
 * - Disabled under prefers-reduced-motion.
 * - The system cursor is NEVER hidden — this is purely additive, so if it
 *   fails the native cursor is still available.
 */
const INTERACTIVE_SELECTOR =
  "a, button, [role='button'], [data-cursor], input, textarea, select, label, summary";

export function CustomCursor() {
  const isFine = useMediaQuery("(pointer: fine)");
  const reduced = usePrefersReducedMotion();
  const enabled = isFine && !reduced;

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  const scale = useMotionValue(1);
  const scaleSpring = useSpring(scale, { stiffness: 380, damping: 24 });

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as HTMLElement | null;
      const interactive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      scale.set(interactive ? 2.4 : 1);
    };
    const onDown = () => scale.set(0.72);
    const onUp = () => scale.set(1);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [enabled, x, y, scale]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] hidden md:block"
      style={{ x: sx, y: sy }}
    >
      {/* Spotlight — constant size, follows the pointer */}
      <div className="absolute left-0 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint-300/20 blur-3xl" />
      {/* Core dot — reacts to interactive elements */}
      <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          style={{ scale: scaleSpring }}
          className="h-2.5 w-2.5 rounded-full bg-mint-500 ring-1 ring-mint-600/40"
        />
      </div>
    </motion.div>
  );
}
