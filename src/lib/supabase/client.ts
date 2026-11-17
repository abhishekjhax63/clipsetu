import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client — for client components and route handlers.
 * Reads env vars at call time so hot-reload of env is possible.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
