"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePrefersReducedMotion } from "./hooks";

interface MagneticButtonProps {
  /** Pull strength in pixels. Default 18. */
  strength?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps any element (typically a Button/Link) with a magnetic hover effect:
 * the element is gently pulled toward the cursor while hovered, then springs
 * back. Touch and reduced-motion users get the plain element.
 */
export function MagneticButton({
  strength = 18,
  children,
  className,
}: MagneticButtonProps) {
  const reduced = usePrefersReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 260, damping: 18 });
  const sy = useSpring(my, { stiffness: 260, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    mx.set((relX / (rect.width / 2)) * strength);
    my.set((relY / (rect.height / 2)) * strength);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
