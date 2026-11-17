import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route prefixes that require an authenticated session.
 * NOTE: the Proxy only performs a coarse authentication check (is there a user?).
 * Authoritative role / authorization checks MUST still run server-side in each
 * page, Server Action and Route Handler close to the data (see src/lib/auth.ts).
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/admin",
  "/settings",
  "/notifications",
];

const AUTH_PAGES = ["/login", "/signup"];

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes("your-project"));
}

/**
 * Refresh the Supabase auth session cookie on every request and enforce a
 * coarse authentication gate on protected routes.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;

  // If Supabase is not configured we cannot validate a session. Do not block
  // navigation — pages render an explicit "setup required" state instead.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: keep this call. It refreshes an expired token so Server
  // Components always see a valid session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed-in users should not see the auth pages.
  if (user && AUTH_PAGES.includes(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
