/**
 * Instagram verification adapter.
 *
 * Uses the official Instagram Graph API (business/creator accounts). We do NOT
 * scrape, and we do NOT attempt to fetch metrics without an authorised token.
 * Without a connected business account the adapter reports `not_configured` /
 * `unauthorized` rather than inventing numbers.
 */
import {
  normalizeUrl,
  type MetricsResult,
  type PlatformAdapter,
  type PostUrlValidation,
} from "./types";

const HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
const PATH_RE = /^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/;

export function isInstagramConfigured(): boolean {
  return Boolean(
    process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET
  );
}

export function validateInstagramPostUrl(url: string): PostUrlValidation {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return { ok: false, error: "Enter a valid URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: "Enter a valid URL." };
  }

  if (!HOSTS.has(parsed.hostname)) {
    return { ok: false, error: "This is not an Instagram link." };
  }

  const match = parsed.pathname.match(PATH_RE);
  if (!match) {
    return {
      ok: false,
      error:
        "Paste the link to a Reel or post (e.g. instagram.com/reel/…). Profile links are not accepted.",
    };
  }

  return { ok: true, externalId: match[2], normalizedUrl: normalized };
}

export const instagramAdapter: PlatformAdapter = {
  platform: "instagram",
  label: "Instagram Reels",
  supportsOAuth: true,
  isConfigured: isInstagramConfigured,
  validatePostUrl: validateInstagramPostUrl,

  async fetchMetrics({ externalId, accessToken }): Promise<MetricsResult> {
    if (!isInstagramConfigured()) {
      return {
        ok: false,
        reason: "not_configured",
        message:
          "Instagram verification needs a connected business/creator account (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET).",
      };
    }

    if (!accessToken) {
      return {
        ok: false,
        reason: "unauthorized",
        message:
          "No authorised Instagram account is connected for this creator.",
      };
    }

    if (!externalId) {
      return { ok: false, reason: "invalid_url" };
    }

    try {
      // The Graph API expects the media id of a business-owned asset. Shortcodes
      // must first be resolved via the connected account's media list.
      const url = new URL(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(externalId)}`
      );
      url.searchParams.set("fields", "like_count,comments_count");
      url.searchParams.set("access_token", accessToken);

      const res = await fetch(url, { cache: "no-store" });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: "unauthorized" };
      }
      if (res.status === 429) return { ok: false, reason: "rate_limited" };
      if (!res.ok) return { ok: false, reason: "provider_error" };

      // View/play counts are exposed via the media insights endpoint and are not
      // always available for every media type — surfaced as unavailable rather
      // than guessed.
      return {
        ok: false,
        reason: "unsupported",
        message:
          "Instagram does not expose a reliable public view count for every media type through the Graph API. This submission needs manual metric review.",
      };
    } catch {
      return { ok: false, reason: "network_error" };
    }
  },
};
