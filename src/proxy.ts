import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 Proxy (formerly "middleware").
 * Runs before routes are rendered to refresh the Supabase session and perform a
 * coarse authentication gate. See src/lib/supabase/middleware.ts.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - api (route handlers & webhooks handle their own auth/verification)
     * - _next/static, _next/image (build assets)
     * - favicon.ico, the service worker, the web manifest and generated PWA
     *   icons (static assets that never need a session refresh)
     * - common static image files
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|pwa-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
