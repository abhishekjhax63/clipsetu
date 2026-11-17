"use client";

import { useSyncExternalStore } from "react";

function subscribeToMediaQuery(query: string) {
  return (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };
}

/**
 * Subscribe to a CSS media query using useSyncExternalStore. Safe for SSR
 * (returns the snapshot until hydrated) and cleans up its listener.
 */
export function useMediaQuery(query: string, initial = false): boolean {
  return useSyncExternalStore(
    subscribeToMediaQuery(query),
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : initial),
    () => initial
  );
}

/** True when the user has requested reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
