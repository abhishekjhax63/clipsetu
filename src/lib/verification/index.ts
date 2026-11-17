/**
 * Verification adapter registry.
 *
 * `getAdapter(platform)` returns the platform adapter or null when the platform
 * is not supported. URL validation is exposed as a standalone helper so forms
 * and server actions can share the exact same rules.
 */
import { instagramAdapter } from "./instagram";
import { youtubeAdapter } from "./youtube";
import type {
  PlatformAdapter,
  PostUrlValidation,
  SocialPlatform,
} from "./types";

export * from "./types";

export const adapters: Record<SocialPlatform, PlatformAdapter> = {
  instagram: instagramAdapter,
  youtube: youtubeAdapter,
};

export const SUPPORTED_PLATFORMS: SocialPlatform[] = ["instagram", "youtube"];

export function isSupportedPlatform(
  platform: string
): platform is SocialPlatform {
  return platform === "instagram" || platform === "youtube";
}

export function getAdapter(platform: string): PlatformAdapter | null {
  return isSupportedPlatform(platform) ? adapters[platform] : null;
}

export function platformLabel(platform: string): string {
  return getAdapter(platform)?.label ?? platform;
}

/**
 * Validates a post URL for a platform. Returns a failure when the platform is
 * unsupported rather than silently accepting the URL.
 */
export function validatePostUrl(
  platform: string,
  url: string
): PostUrlValidation {
  const adapter = getAdapter(platform);
  if (!adapter) {
    return { ok: false, error: "This platform is not supported yet." };
  }
  return adapter.validatePostUrl(url);
}

/** Platforms the server can actually verify right now (credentials present). */
export function configuredPlatforms(): SocialPlatform[] {
  return SUPPORTED_PLATFORMS.filter((p) => adapters[p].isConfigured());
}
