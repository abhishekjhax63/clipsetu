import "server-only";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Brand directory for marketplace display.
 *
 * `brand_profiles` is only readable by the owning brand (or admins) under RLS,
 * so a clipper browsing campaigns cannot read another brand's name/logo through
 * the request-scoped client. This helper reads the public-facing brand fields
 * with the service-role client when it is available, purely for display.
 *
 * It never fabricates data: when the service role key is absent or the request
 * fails, the map is simply empty and callers fall back to a neutral label.
 */
export interface BrandInfo {
  brandName: string | null;
  logoUrl: string | null;
  businessCategory: string | null;
}

export function brandDirectoryConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

interface BrandRow {
  user_id: string;
  brand_name: string | null;
  logo_url: string | null;
  business_category: string | null;
}

export async function getBrandDirectory(
  brandIds: string[]
): Promise<Map<string, BrandInfo>> {
  const directory = new Map<string, BrandInfo>();
  const ids = [...new Set(brandIds.filter(Boolean))];
  if (ids.length === 0 || !brandDirectoryConfigured()) return directory;

  try {
    const supabase = await createAdminClient();
    const { data } = (await supabase
      .from("brand_profiles")
      .select("user_id, brand_name, logo_url, business_category")
      .in("user_id", ids)) as { data: BrandRow[] | null };

    for (const row of data ?? []) {
      directory.set(row.user_id, {
        brandName: row.brand_name,
        logoUrl: row.logo_url,
        businessCategory: row.business_category,
      });
    }
  } catch {
    // Enrichment is best-effort; never block rendering on it.
  }

  return directory;
}
