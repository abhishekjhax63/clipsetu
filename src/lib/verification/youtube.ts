/**
 * YouTube verification adapter (YouTube Data API v3).
 *
 * Uses the official public statistics endpoint with an API key. View counts are
 * public for a video; like/comment counts are public too. Shares are not exposed
 * by the API, so they are stored as null rather than fabricated.
 */
import {
  normalizeUrl,
  type MetricsResult,
  type PlatformAdapter,
  type PostUrlValidation,
} from "./types";

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,}$/;

function extractVideoId(parsed: URL): string | null {
  if (parsed.hostname === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return VIDEO_ID_RE.test(id) ? id : null;
  }

  if (parsed.pathname.startsWith("/shorts/")) {
    const id = parsed.pathname.split("/")[2] ?? "";
    return VIDEO_ID_RE.test(id) ? id : null;
  }

  if (parsed.pathname === "/watch") {
    const id = parsed.searchParams.get("v") ?? "";
    return VIDEO_ID_RE.test(id) ? id : null;
  }

  return null;
}

export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export function validateYouTubePostUrl(url: string): PostUrlValidation {
  const normalized = normalizeUrl(url);
  if (!normalized) return { ok: false, error: "Enter a valid URL." };

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: "Enter a valid URL." };
  }

  if (!HOSTS.has(parsed.hostname)) {
    return { ok: false, error: "This is not a YouTube link." };
  }

  const id = extractVideoId(parsed);
  if (!id) {
    return {
      ok: false,
      error:
        "Paste a YouTube Shorts or video link (e.g. youtube.com/shorts/…).",
    };
  }

  return { ok: true, externalId: id, normalizedUrl: normalized };
}

export const youtubeAdapter: PlatformAdapter = {
  platform: "youtube",
  label: "YouTube Shorts",
  supportsOAuth: false,
  isConfigured: isYouTubeConfigured,
  validatePostUrl: validateYouTubePostUrl,

  async fetchMetrics({ externalId }): Promise<MetricsResult> {
    if (!isYouTubeConfigured()) {
      return {
        ok: false,
        reason: "not_configured",
        message:
          "YouTube verification needs a YouTube Data API key (YOUTUBE_API_KEY).",
      };
    }

    if (!externalId) return { ok: false, reason: "invalid_url" };

    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "statistics");
      url.searchParams.set("id", externalId);
      url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

      const res = await fetch(url, { cache: "no-store" });

      if (res.status === 403 || res.status === 429) {
        return { ok: false, reason: "rate_limited" };
      }
      if (!res.ok) return { ok: false, reason: "provider_error" };

      const json = (await res.json()) as {
        items?: Array<{
          statistics?: {
            viewCount?: string;
            likeCount?: string;
            commentCount?: string;
          };
        }>;
      };

      const item = json.items?.[0];
      if (!item?.statistics) return { ok: false, reason: "not_found" };

      const s = item.statistics;
      return {
        ok: true,
        metrics: {
          views: Number(s.viewCount ?? 0),
          likes: s.likeCount != null ? Number(s.likeCount) : null,
          comments: s.commentCount != null ? Number(s.commentCount) : null,
          shares: null,
          fetchedAt: new Date().toISOString(),
          source: "youtube_data_api",
          confidence: "api_verified",
        },
      };
    } catch {
      return { ok: false, reason: "network_error" };
    }
  },
};
