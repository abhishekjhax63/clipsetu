/**
 * Shared campaign + submission validation and display metadata.
 *
 * Used by both the brand (create/manage) and clipper (discover/join/submit)
 * flows so validation rules never drift between the two.
 */
import { z } from "zod";

export const CAMPAIGN_TYPE_IDS = [
  "video_clipping",
  "ugc",
  "music_promotion",
  "brand_promotion",
  "custom",
] as const;

export const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  video_clipping: "Video Clipping",
  ugc: "UGC Creation",
  music_promotion: "Music Promotion",
  brand_promotion: "Logo / Brand Promotion",
  custom: "Custom Creator Campaign",
};

export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending payment",
  pending_review: "Pending review",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  pending_review: "Pending review",
  processing: "Processing",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision requested",
  metrics_unavailable: "Metrics unavailable",
  disputed: "Disputed",
};

export type BadgeTone =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

export const CAMPAIGN_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "secondary",
  pending_payment: "warning",
  pending_review: "warning",
  scheduled: "info",
  active: "success",
  paused: "warning",
  completed: "secondary",
  rejected: "danger",
  cancelled: "danger",
};

export const SUBMISSION_STATUS_TONE: Record<string, BadgeTone> = {
  submitted: "info",
  pending_review: "warning",
  processing: "info",
  approved: "success",
  rejected: "danger",
  revision_requested: "warning",
  metrics_unavailable: "warning",
  disputed: "danger",
};

// ---------------------------------------------------------------------------
// Form parsing helpers (FormData -> plain object)
// ---------------------------------------------------------------------------

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function numOrNull(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function list(fd: FormData, key: string): string[] {
  return fd
    .getAll(key)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

// ---------------------------------------------------------------------------
// Campaign schema
// ---------------------------------------------------------------------------

export const campaignFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(4, "Title must be at least 4 characters")
      .max(140, "Title is too long"),
    description: z.string().trim().max(5000).default(""),
    category: z.string().trim().max(80).default(""),
    type: z.enum(CAMPAIGN_TYPE_IDS),
    objective: z.string().trim().max(500).default(""),
    thumbnailUrl: z.string().trim().max(500).default(""),
    platforms: z
      .array(z.enum(["instagram", "youtube"]))
      .min(1, "Select at least one platform"),
    budget: z.number().min(0).max(100_000_000),
    rewardPer1k: z.number().min(0).max(1_000_000),
    maxRewardPerSubmission: z.number().min(0).max(100_000_000).nullable(),
    maxCampaignReward: z.number().min(0).max(100_000_000).nullable(),
    minViews: z.number().int().min(0).max(1_000_000_000),
    maxSubmissionsPerCreator: z.number().int().min(1).max(1000).nullable(),
    maxTotalSubmissions: z.number().int().min(1).max(1_000_000).nullable(),
    requiredHashtags: z.array(z.string().max(60)).max(50).default([]),
    requiredMentions: z.array(z.string().max(60)).max(50).default([]),
    captionRequirements: z.string().trim().max(2000).default(""),
    minDurationSeconds: z.number().int().min(0).max(3600).nullable(),
    maxDurationSeconds: z.number().int().min(0).max(3600).nullable(),
    contentRestrictions: z.string().trim().max(2000).default(""),
    mandatoryBranding: z.string().trim().max(1000).default(""),
    prohibitedContent: z.string().trim().max(2000).default(""),
    language: z.string().trim().max(60).default(""),
    disclosureRequired: z.boolean(),
    eligibleCategories: z.array(z.string().max(60)).max(30).default([]),
    minFollowers: z.number().int().min(0).max(100_000_000).nullable(),
    geographicRestrictions: z.array(z.string().max(60)).max(30).default([]),
    ageRequirement: z.number().int().min(18).max(99),
    startDate: z.string().trim().default(""),
    endDate: z.string().trim().default(""),
    submissionDeadline: z.string().trim().default(""),
    publish: z.boolean(),
  })
  .refine(
    (d) =>
      d.minDurationSeconds == null ||
      d.maxDurationSeconds == null ||
      d.minDurationSeconds <= d.maxDurationSeconds,
    { message: "Minimum duration cannot exceed maximum", path: ["maxDurationSeconds"] }
  )
  .refine(
    (d) =>
      !d.submissionDeadline ||
      !d.endDate ||
      new Date(d.submissionDeadline) <= new Date(d.endDate),
    { message: "Submission deadline must be on or before the end date", path: ["submissionDeadline"] }
  );

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export interface ParseResult<T> {
  ok: boolean;
  data?: T;
  errors?: Record<string, string[]>;
}

export function parseCampaignForm(fd: FormData): ParseResult<CampaignFormValues> {
  const raw = {
    title: str(fd, "title"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    type: str(fd, "type"),
    objective: str(fd, "objective"),
    thumbnailUrl: str(fd, "thumbnailUrl"),
    platforms: list(fd, "platforms"),
    budget: numOrNull(fd, "budget") ?? 0,
    rewardPer1k: numOrNull(fd, "rewardPer1k") ?? 0,
    maxRewardPerSubmission: numOrNull(fd, "maxRewardPerSubmission"),
    maxCampaignReward: numOrNull(fd, "maxCampaignReward"),
    minViews: numOrNull(fd, "minViews") ?? 0,
    maxSubmissionsPerCreator: numOrNull(fd, "maxSubmissionsPerCreator"),
    maxTotalSubmissions: numOrNull(fd, "maxTotalSubmissions"),
    requiredHashtags: list(fd, "requiredHashtags"),
    requiredMentions: list(fd, "requiredMentions"),
    captionRequirements: str(fd, "captionRequirements"),
    minDurationSeconds: numOrNull(fd, "minDurationSeconds"),
    maxDurationSeconds: numOrNull(fd, "maxDurationSeconds"),
    contentRestrictions: str(fd, "contentRestrictions"),
    mandatoryBranding: str(fd, "mandatoryBranding"),
    prohibitedContent: str(fd, "prohibitedContent"),
    language: str(fd, "language"),
    disclosureRequired: bool(fd, "disclosureRequired"),
    eligibleCategories: list(fd, "eligibleCategories"),
    minFollowers: numOrNull(fd, "minFollowers"),
    geographicRestrictions: list(fd, "geographicRestrictions"),
    ageRequirement: numOrNull(fd, "ageRequirement") ?? 18,
    startDate: str(fd, "startDate"),
    endDate: str(fd, "endDate"),
    submissionDeadline: str(fd, "submissionDeadline"),
    publish: bool(fd, "publish"),
  };

  const parsed = campaignFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  return { ok: true, data: parsed.data };
}

// ---------------------------------------------------------------------------
// Submission schema
// ---------------------------------------------------------------------------

export const submissionFormSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign"),
  platform: z.enum(["instagram", "youtube"]),
  postUrl: z.string().trim().url("Enter a valid post URL").max(500),
  caption: z.string().trim().max(2000).default(""),
});

export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export function parseSubmissionForm(fd: FormData): ParseResult<SubmissionFormValues> {
  const parsed = submissionFormSchema.safeParse({
    campaignId: str(fd, "campaignId"),
    platform: str(fd, "platform"),
    postUrl: str(fd, "postUrl"),
    caption: str(fd, "caption"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  return { ok: true, data: parsed.data };
}

/** Rupee helper for consistent formatting on server-rendered pages. */
export function formatRupees(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}
