"use client";

import { useEffect } from "react";

/**
 * Registers the ClipSetu service worker so the app is installable and can show
 * an offline fallback.
 *
 * Registration is intentionally limited to production builds: a service worker
 * in development would cache build assets across hot reloads and cause
 * confusing stale output.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Registration failing (e.g. insecure context) must never break the app.
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
