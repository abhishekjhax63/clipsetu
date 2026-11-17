import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Password reset callback route.
 *
 * Supabase redirects here (via the redirectTo in resetPasswordForEmail)
 * with a `code` query parameter. We exchange that code for a recovery
 * session, then redirect to the password reset form.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session is now set in cookies; send user to the password form
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=reset_link_invalid`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
