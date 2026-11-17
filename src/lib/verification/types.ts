/**
 * Shared types for social platform verification adapters.
 *
 * Design rule (from the spec): we only ever use documented, official platform
 * capabilities. When a metric cannot be fetched through an official API, it is
 * marked `unavailable` / `manual_unverified` — never presented as API-verified.
 */

export type SocialPlatform = "instagram" | "youtube";

export type MetricsConfidence =
  | "api_verified"
  | "manual_unverified"
  | "unavailable";

export interface PostUrlValidation {
  ok: boolean;
  error?: string;
  /** Platform-native identifier extracted from the URL (shortcode / video id). */
  externalId?: string;
  normalizedUrl?: string;
}

export interface MetricsSnapshot {
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  /** ISO timestamp of when the provider returned this data. */
  fetchedAt: string;
  source: "youtube_data_api" | "instagram_graph" | "manual";
  confidence: MetricsConfidence;
}

export type MetricsFailureReason =
  | "not_configured"
  | "invalid_url"
  | "not_found"
  | "unauthorized"
  | "rate_limited"
  | "provider_error"
  | "network_error"
  | "unsupported";

export interface MetricsResult {
  ok: boolean;
  reason?: MetricsFailureReason;
  message?: string;
  metrics?: MetricsSnapshot;
}

export interface FetchMetricsInput {
  url: string;
  externalId?: string;
  /** OAuth access token for platforms that require authorised access. */
  accessToken?: string | null;
}

export interface PlatformAdapter {
  platform: SocialPlatform;
  label: string;
  /** True when the server has the credentials required to call the API. */
  isConfigured(): boolean;
  supportsOAuth: boolean;
  validatePostUrl(url: string): PostUrlValidation;
  fetchMetrics(input: FetchMetricsInput): Promise<MetricsResult>;
}

/** Trims whitespace and returns a normalized https URL, or null if invalid. */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.protocol = "https:";
    url.hash = "";
    // Drop tracking params.
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "igsh" || key === "si") {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
