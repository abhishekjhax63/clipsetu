import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clipsetu.com";

/**
 * robots.txt — index the public marketing + discovery surface, keep the
 * authenticated app, admin area, and API private.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/onboarding",
        "/notifications",
        "/settings",
        "/unauthorized",
        "/offline",
        "/auth/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
