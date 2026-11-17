import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Admin-managed site content (Phase 7: Platform configuration).
 *
 * Values live in the `cms_content` table and are edited in the admin Content
 * console. Public pages read the PUBLISHED value here; if a key is missing,
 * malformed, or Supabase is not configured, the built-in default below is used
 * so the public site never renders an empty page.
 *
 * Reads are cached (Cache Components) under the `cms-content` tag and are
 * expired immediately with `updateTag(CMS_TAG)` when an admin publishes, so
 * editors see their change on the next request.
 */

/** Cache tag invalidated whenever an admin edits/publishes content. */
export const CMS_TAG = "cms-content";

/**
 * CMS-authored links are untrusted input: only same-origin paths and secure
 * https URLs are rendered. Anything else falls back to the provided default.
 */
export function safeContentHref(
  href: string | null | undefined,
  fallback: string
): string {
  if (!href) return fallback;
  const trimmed = href.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return fallback;
}

export const CMS_KEYS = {
  homeHero: "homepage.hero",
  homeStats: "homepage.stats",
  homeHowItWorks: "homepage.how_it_works",
  helpCategories: "help.categories",
  announcement: "system.announcement",
} as const;

/**
 * Supabase client WITHOUT cookies so it can be used inside a `use cache` scope.
 * The `cms_content_read` RLS policy exposes published rows to the anon role.
 */
function createPublicContentClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function readPublished<T>(key: string, fallback: T): Promise<T> {
  "use cache";
  cacheLife("hours");
  cacheTag(CMS_TAG);

  if (!isSupabaseConfigured()) return fallback;

  try {
    const supabase = createPublicContentClient();
    const { data, error } = await supabase
      .from("cms_content")
      .select("value")
      .eq("key", key)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data || data.value == null) return fallback;
    return data.value as T;
  } catch {
    // A backend hiccup must never take the public site down.
    return fallback;
  }
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface HomeHero {
  badge: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

export interface HomeStat {
  label: string;
  value: string;
}

export interface HomeStep {
  step: string;
  title: string;
  desc: string;
}

export type HelpIconKey =
  | "rocket"
  | "users"
  | "badge-check"
  | "wallet"
  | "lock"
  | "scroll-text";

export interface HelpCategory {
  icon: HelpIconKey;
  title: string;
  desc: string;
  articles: string[];
}

export type AnnouncementTone = "info" | "success" | "warning";

export interface Announcement {
  enabled: boolean;
  tone: AnnouncementTone;
  message: string;
  href: string | null;
  linkLabel: string | null;
}

/* -------------------------------------------------------------------------- */
/* Defaults (mirror the seeded rows in supabase/migrations/0007_cms.sql)      */
/* -------------------------------------------------------------------------- */

export const DEFAULT_HOME_HERO: HomeHero = {
  badge: "🇮🇳 India-first creator marketplace",
  title: "Create. Clip. Publish.",
  titleAccent: "Earn.",
  subtitle:
    "Turn your creativity into opportunity. Discover campaigns, publish clips and earn rewards for verified performance.",
  primaryCtaLabel: "Start earning",
  primaryCtaHref: "/signup",
  secondaryCtaLabel: "See how it works",
  secondaryCtaHref: "/how-it-works",
};

/**
 * These are platform *facts* (mirroring src/lib/constants.ts), not adoption
 * metrics. Real, admin-published totals can be set via the `homepage.stats`
 * CMS key; until then we must never present invented platform statistics.
 */
export const DEFAULT_HOME_STATS: HomeStat[] = [
  { label: "Platform fee", value: "10%" },
  { label: "Min withdrawal", value: "₹100" },
  { label: "Payout basis", value: "Verified views" },
  { label: "Settlement", value: "INR" },
];

export const DEFAULT_HOME_HOW_IT_WORKS: HomeStep[] = [
  {
    step: "01",
    title: "Discover a campaign",
    desc: "Browse active campaigns from brands across India. Filter by platform, category and reward.",
  },
  {
    step: "02",
    title: "Create and publish your clip",
    desc: "Download source materials, create your reel or short, and publish it on Instagram or YouTube.",
  },
  {
    step: "03",
    title: "Submit your post",
    desc: "Paste your published post URL. We validate it and pull verified metrics through official APIs.",
  },
  {
    step: "04",
    title: "Earn based on verified performance",
    desc: "Rewards are calculated from eligible verified views and released to your wallet automatically.",
  },
];

export const DEFAULT_HELP_CATEGORIES: HelpCategory[] = [
  {
    icon: "rocket",
    title: "Getting Started",
    desc: "Create an account, choose your role and set up your profile.",
    articles: [
      "How do I create a ClipSetu account?",
      "Should I sign up as a creator or a brand?",
      "How do I complete my profile?",
      "What are the eligibility requirements?",
    ],
  },
  {
    icon: "users",
    title: "For Creators",
    desc: "Find campaigns, download source material, submit clips and track results.",
    articles: [
      "How do I join a campaign?",
      "How do I submit a published post URL?",
      "Why was my submission rejected?",
      "How are verified views calculated?",
      "What is the minimum follower requirement?",
    ],
  },
  {
    icon: "badge-check",
    title: "For Brands",
    desc: "Launch campaigns, fund budgets, review submissions and read analytics.",
    articles: [
      "How do I create and fund a campaign?",
      "How do I set reward rules and budgets?",
      "How do I review creator submissions?",
      "What happens to unused campaign budget?",
    ],
  },
  {
    icon: "wallet",
    title: "Payments & Payouts",
    desc: "Understand rewards, the platform fee, withdrawals and timelines.",
    articles: [
      "What is the minimum withdrawal amount?",
      "What platform fee does ClipSetu charge?",
      "How long do withdrawals take?",
      "Why is my payout on hold?",
      "Which payment provider is used for payouts?",
    ],
  },
  {
    icon: "lock",
    title: "Account & Security",
    desc: "Protect your account, manage login and resolve access issues.",
    articles: [
      "How do I reset my password?",
      "How do I enable two-factor authentication?",
      "How do I report a suspicious login?",
      "How do I delete my account?",
    ],
  },
  {
    icon: "scroll-text",
    title: "Verification & KYC",
    desc: "Verify your identity and stay compliant before withdrawing earnings.",
    articles: [
      "Why do I need KYC to withdraw?",
      "What documents are accepted for KYC?",
      "How long does verification take?",
      "Why was my verification rejected?",
    ],
  },
];

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  enabled: false,
  tone: "info",
  message: "",
  href: null,
  linkLabel: null,
};

/* -------------------------------------------------------------------------- */
/* Shape guards — admin-authored JSON must not be able to break a public page. */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const HELP_ICON_KEYS: readonly HelpIconKey[] = [
  "rocket",
  "users",
  "badge-check",
  "wallet",
  "lock",
  "scroll-text",
];

function isHomeHero(value: unknown): value is HomeHero {
  return (
    isRecord(value) &&
    typeof value.badge === "string" &&
    typeof value.title === "string" &&
    typeof value.titleAccent === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.primaryCtaLabel === "string" &&
    typeof value.primaryCtaHref === "string" &&
    typeof value.secondaryCtaLabel === "string" &&
    typeof value.secondaryCtaHref === "string"
  );
}

function isHomeStats(value: unknown): value is HomeStat[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.label === "string" &&
        typeof item.value === "string"
    )
  );
}

function isHomeSteps(value: unknown): value is HomeStep[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.step === "string" &&
        typeof item.title === "string" &&
        typeof item.desc === "string"
    )
  );
}

function isHelpCategories(value: unknown): value is HelpCategory[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        isRecord(item) &&
        isNonEmptyString(item.title) &&
        typeof item.desc === "string" &&
        Array.isArray(item.articles) &&
        item.articles.every((article) => typeof article === "string")
    )
  );
}

function isAnnouncement(value: unknown): value is Announcement {
  return (
    isRecord(value) &&
    typeof value.enabled === "boolean" &&
    typeof value.message === "string" &&
    (value.tone === "info" ||
      value.tone === "success" ||
      value.tone === "warning")
  );
}

/* -------------------------------------------------------------------------- */
/* Typed getters                                                              */
/* -------------------------------------------------------------------------- */

export async function getHomeHero(): Promise<HomeHero> {
  const value = await readPublished<unknown>(
    CMS_KEYS.homeHero,
    DEFAULT_HOME_HERO
  );
  return isHomeHero(value) ? value : DEFAULT_HOME_HERO;
}

export async function getHomeStats(): Promise<HomeStat[]> {
  const value = await readPublished<unknown>(
    CMS_KEYS.homeStats,
    DEFAULT_HOME_STATS
  );
  return isHomeStats(value) ? value : DEFAULT_HOME_STATS;
}

export async function getHomeHowItWorks(): Promise<HomeStep[]> {
  const value = await readPublished<unknown>(
    CMS_KEYS.homeHowItWorks,
    DEFAULT_HOME_HOW_IT_WORKS
  );
  return isHomeSteps(value) ? value : DEFAULT_HOME_HOW_IT_WORKS;
}

export async function getHelpCategories(): Promise<HelpCategory[]> {
  const value = await readPublished<unknown>(
    CMS_KEYS.helpCategories,
    DEFAULT_HELP_CATEGORIES
  );
  if (!isHelpCategories(value)) return DEFAULT_HELP_CATEGORIES;
  // Normalise unknown icon keys so the page always resolves an icon.
  return value.map((category) => ({
    ...category,
    icon: HELP_ICON_KEYS.includes(category.icon)
      ? category.icon
      : "rocket",
  }));
}

export async function getAnnouncement(): Promise<Announcement> {
  const value = await readPublished<unknown>(
    CMS_KEYS.announcement,
    DEFAULT_ANNOUNCEMENT
  );
  return isAnnouncement(value) ? value : DEFAULT_ANNOUNCEMENT;
}

/* -------------------------------------------------------------------------- */
/* Public campaign showcase                                                    */
/* -------------------------------------------------------------------------- */

export interface PublicCampaign {
  id: string;
  brand: string;
  title: string;
  category: string | null;
  type: string;
  reward_per_1k_views: number;
  min_views: number;
  end_date: string | null;
  status: string;
}

/**
 * Active + scheduled campaigns, publicly readable (RLS: campaigns_public_read).
 * Shorter cache than CMS content so the marketplace stays fresh. Returns [] if
 * Supabase is not configured or the query fails.
 */
export async function getPublicCampaigns(limit = 6): Promise<PublicCampaign[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CMS_TAG);

  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createPublicContentClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        "id, brand:profiles!campaigns_brand_id_fkey(full_name), title, category, type, reward_per_1k_views, min_views, end_date, status"
      )
      .in("status", ["active", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data
      .map((row: Record<string, unknown>) => {
        const brand =
          (row.brand as { full_name?: string } | null)?.full_name?.trim() ||
          "A brand";
        return {
          id: String(row.id),
          brand,
          title: String(row.title),
          category: row.category ? String(row.category) : null,
          type: String(row.type),
          reward_per_1k_views: Number(row.reward_per_1k_views) || 0,
          min_views: Number(row.min_views) || 0,
          end_date: row.end_date ? String(row.end_date) : null,
          status: String(row.status),
        } as PublicCampaign;
      })
      .filter((c) => c.title);
  } catch {
    return [];
  }
}
