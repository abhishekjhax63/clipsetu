/*
 * ClipSetu service worker.
 *
 * Deliberately conservative:
 *   - navigations are network-first (never serve stale HTML) with an offline
 *     fallback page when the network is unavailable;
 *   - only immutable build assets and generated icons are cached;
 *   - API routes and cross-origin requests are never intercepted.
 */

const CACHE = "clipsetu-static-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE).catch(() => {});
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: always try the network first so authenticated/personalised
  // pages are never stale; fall back to the offline page when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return offline || Response.error();
        }
      })()
    );
    return;
  }

  const cacheableAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/pwa-icon/") ||
    url.pathname.startsWith("/apple-icon") ||
    url.pathname.startsWith("/icon");

  if (cacheableAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })()
    );
  }
});
