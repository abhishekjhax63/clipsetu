import type { MetadataRoute } from "next";
import { APP_BRAND, APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Web app manifest — makes ClipSetu installable as a standalone PWA.
 * Icons are generated on demand by src/app/pwa-icon/[size]/route.tsx so no
 * binary assets need to be committed.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${APP_BRAND}`,
    short_name: APP_NAME,
    description: `${APP_TAGLINE} India's creator-powered clipping marketplace where brands launch campaigns and creators earn from verified views.`,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#0b0f17",
    lang: "en-IN",
    dir: "ltr",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
