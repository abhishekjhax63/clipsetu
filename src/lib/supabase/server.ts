import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Whether real Supabase credentials are present. When false, server code must
 * NOT call createClient() (it would throw) and should render an explicit
 * "setup required" state instead of pretending to work.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes("your-project"));
}

/**
 * Supabase server client for Server Components, Route Handlers and Server
 * Actions. Uses the anon key plus the request's auth cookies, so all queries
 * are subject to Row Level Security as the signed-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The setAll method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the service role key. Use ONLY in trusted server-side code
 * that needs to bypass RLS (e.g. admin server actions, webhook handlers).
 * Never expose this to the client.
 */
export async function createAdminClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore
          }
        },
      },
    }
  );
}
