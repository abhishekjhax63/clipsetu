import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback route handler.
 *
 * Supabase redirects here after:
 *  - Email confirmation (signUp with email confirmation enabled)
 *  - OAuth login (Google, etc.)
 *  - Magic link login
 *
 * The `code` query parameter is exchanged for a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // If "next" is present in query params, redirect there after login; otherwise dashboard
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // If code exchange failed, redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=callback_failed`);
  }

  // No code provided — redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
