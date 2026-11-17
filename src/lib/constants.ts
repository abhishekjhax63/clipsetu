/**
 * CLIPSETU — global constants
 */

export const APP_NAME = "ClipSetu";
export const APP_TAGLINE = "Create. Clip. Publish. Earn.";
export const APP_BRAND = "India's Creator-Powered Clipping Marketplace";

export const CURRENCY = "INR";
export const CURRENCY_SYMBOL = "₹";

/** Platform fee percentage (configurable, default shown for India market). */
export const PLATFORM_FEE_PERCENT = 10;

/** Minimum withdrawal threshold in INR. */
export const MIN_WITHDRAWAL_INR = 100;

/** Default page sizes. */
export const PAGE_SIZE = 20;

/** Supported social platforms for submissions. */
export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram Reels", icon: "instagram" },
  { id: "youtube", label: "YouTube Shorts", icon: "youtube" },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

/** Campaign types. */
export const CAMPAIGN_TYPES = [
  { id: "video_clipping", label: "Video Clipping" },
  { id: "ugc", label: "UGC Creation" },
  { id: "music_promotion", label: "Music Promotion" },
  { id: "brand_promotion", label: "Logo / Brand Promotion" },
  { id: "custom", label: "Custom Creator Campaign" },
] as const;

/** Campaign statuses. */
export const CAMPAIGN_STATUSES = [
  "draft",
  "pending_payment",
  "pending_review",
  "scheduled",
  "active",
  "paused",
  "completed",
  "rejected",
  "cancelled",
] as const;

/** Submission statuses. */
export const SUBMISSION_STATUSES = [
  "submitted",
  "pending_review",
  "processing",
  "approved",
  "rejected",
  "revision_requested",
  "metrics_unavailable",
  "disputed",
] as const;

/** User roles. */
export const USER_ROLES = [
  "brand",
  "clipper",
  "admin",
  "super_admin",
  "moderation",
] as const;

/** Verification statuses. */
export const VERIFICATION_STATUSES = [
  "not_submitted",
  "pending",
  "under_review",
  "verified",
  "rejected",
  "suspended",
] as const;

/** Wallet transaction types. */
export const TXN_TYPES = [
  "deposit",
  "reward",
  "withdrawal",
  "refund",
  "adjustment",
  "reversal",
  "platform_fee",
] as const;

/** Public site navigation. */
export const PUBLIC_NAV = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "For Brands", href: "/for-brands" },
  { label: "For Clippers", href: "/for-clippers" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
] as const;

/** Business categories for brand onboarding & campaign creation. */
export const BUSINESS_CATEGORIES = [
  "Technology",
  "Fashion & Apparel",
  "Beauty & Personal Care",
  "Food & Beverage",
  "Health & Fitness",
  "Travel & Hospitality",
  "Finance & Fintech",
  "Education",
  "Gaming & Esports",
  "Entertainment & Media",
  "Automotive",
  "D2C / E-commerce",
  "Other",
] as const;

/** Content categories creators can select during onboarding. */
export const CONTENT_CATEGORIES = [
  "Technology",
  "Fashion",
  "Beauty",
  "Food",
  "Fitness",
  "Travel",
  "Finance",
  "Education",
  "Gaming",
  "Entertainment",
  "Automotive",
  "Lifestyle",
] as const;
