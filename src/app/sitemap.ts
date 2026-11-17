import type { MetadataRoute } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clipsetu.com";

/** Public marketing + resource pages (path, priority, change frequency). */
const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/campaigns", priority: 0.9, changeFrequency: "daily" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-brands", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-clippers", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help", priority: 0.5, changeFrequency: "monthly" },
  { path: "/guidelines/creator", priority: 0.4, changeFrequency: "monthly" },
  { path: "/guidelines/brand", priority: 0.4, changeFrequency: "monthly" },
  { path: "/guidelines/community", priority: 0.4, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  { path: "/payments", priority: 0.3, changeFrequency: "yearly" },
];

interface CampaignRow {
  id: string;
  updated_at: string;
}

/**
 * Publicly discoverable campaigns (RLS exposes active/scheduled to anonymous).
 * Best-effort: any failure simply omits the dynamic entries.
 */
async function getPublicCampaigns(): Promise<CampaignRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from("campaigns")
      .select("id, updated_at")
      .in("status", ["active", "scheduled"])
      .order("updated_at", { ascending: false })
      .limit(1000);

    return (data as CampaignRow[] | null) ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const campaigns = await getPublicCampaigns();
  const campaignEntries: MetadataRoute.Sitemap = campaigns.map((campaign) => ({
    url: `${baseUrl}/campaigns/${campaign.id}`,
    lastModified: new Date(campaign.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...campaignEntries];
}
