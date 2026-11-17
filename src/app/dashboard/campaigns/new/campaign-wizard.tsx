"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Megaphone,
  Plus,
  Rocket,
  Scissors,
  Sparkles,
  X,
} from "lucide-react";
import { createCampaign, type CampaignActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BUSINESS_CATEGORIES,
  CONTENT_CATEGORIES,
  PLATFORM_FEE_PERCENT,
} from "@/lib/constants";
import {
  CAMPAIGN_TYPE_IDS,
  CAMPAIGN_TYPE_LABEL,
  formatRupees,
} from "@/lib/campaigns";
import { cn, formatNumber } from "@/lib/utils";

const STEPS = [
  "Basics",
  "Campaign type",
  "Source materials",
  "Platforms",
  "Budget & rewards",
  "Content guidelines",
  "Audience",
  "Schedule",
  "Review & publish",
];

const SELECT_CLASS =
  "flex h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 disabled:opacity-50";

const TYPE_META: Record<string, { icon: LucideIcon; desc: string }> = {
  video_clipping: {
    icon: Scissors,
    desc: "Creators clip your long-form video into short, high-reach edits.",
  },
  ugc: {
    icon: Camera,
    desc: "Original creator content produced against your brief.",
  },
  music_promotion: {
    icon: Sparkles,
    desc: "Promote a track or audio through creator clips.",
  },
  brand_promotion: {
    icon: Megaphone,
    desc: "Logo, product or brand-awareness content.",
  },
  custom: {
    icon: Layers,
    desc: "Anything else — define your own rules in the next steps.",
  },
};

const ASSET_TYPE_OPTIONS = [
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "logo", label: "Logo" },
  { value: "document", label: "Document" },
  { value: "reference", label: "Reference link" },
];

interface WizardValues {
  title: string;
  description: string;
  category: string;
  type: string;
  objective: string;
  thumbnailUrl: string;
  budget: string;
  rewardPer1k: string;
  maxRewardPerSubmission: string;
  maxCampaignReward: string;
  minViews: string;
  maxSubmissionsPerCreator: string;
  maxTotalSubmissions: string;
  captionRequirements: string;
  minDurationSeconds: string;
  maxDurationSeconds: string;
  contentRestrictions: string;
  mandatoryBranding: string;
  prohibitedContent: string;
  language: string;
  disclosureRequired: boolean;
  minFollowers: string;
  ageRequirement: string;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  publish: boolean;
}

const INITIAL: WizardValues = {
  title: "",
  description: "",
  category: "",
  type: "video_clipping",
  objective: "",
  thumbnailUrl: "",
  budget: "",
  rewardPer1k: "",
  maxRewardPerSubmission: "",
  maxCampaignReward: "",
  minViews: "0",
  maxSubmissionsPerCreator: "",
  maxTotalSubmissions: "",
  captionRequirements: "",
  minDurationSeconds: "",
  maxDurationSeconds: "",
  contentRestrictions: "",
  mandatoryBranding: "",
  prohibitedContent: "",
  language: "",
  disclosureRequired: true,
  minFollowers: "",
  ageRequirement: "18",
  startDate: "",
  endDate: "",
  submissionDeadline: "",
  publish: true,
};

/** Maps a server field error to the wizard step that owns it. */
const FIELD_STEP: Record<string, number> = {
  title: 0,
  description: 0,
  category: 0,
  type: 0,
  objective: 0,
  thumbnailUrl: 0,
  platforms: 3,
  budget: 4,
  rewardPer1k: 4,
  maxRewardPerSubmission: 4,
  maxCampaignReward: 4,
  minViews: 4,
  maxSubmissionsPerCreator: 4,
  maxTotalSubmissions: 4,
  requiredHashtags: 5,
  requiredMentions: 5,
  captionRequirements: 5,
  minDurationSeconds: 5,
  maxDurationSeconds: 5,
  contentRestrictions: 5,
  mandatoryBranding: 5,
  prohibitedContent: 5,
  language: 5,
  disclosureRequired: 5,
  eligibleCategories: 6,
  minFollowers: 6,
  geographicRestrictions: 6,
  ageRequirement: 6,
  startDate: 7,
  endDate: 7,
  submissionDeadline: 7,
  publish: 8,
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-danger">{message}</p>;
}

function TagField({
  name,
  label,
  placeholder,
  hint,
  values,
  onChange,
  error,
}: {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const raw = draft.trim();
    if (!raw) return;
    const cleaned =
      name === "requiredHashtags" ? raw.replace(/^#+/, "") : raw;
    if (cleaned && !values.includes(cleaned)) onChange([...values, cleaned]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-ink-700"
            >
              {value}
              <input type="hidden" name={name} value={value} />
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="text-ink-400 transition-colors hover:text-danger"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {hint ? <p className="text-xs text-ink-400">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-soft py-2.5 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="text-right text-sm font-medium text-ink-900">
        {value || <span className="text-ink-400">Not set</span>}
      </span>
    </div>
  );
}

export function CampaignWizard() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardValues>(INITIAL);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [tags, setTags] = useState({
    requiredHashtags: [] as string[],
    requiredMentions: [] as string[],
    eligibleCategories: [] as string[],
    geographicRestrictions: [] as string[],
  });
  const [assets, setAssets] = useState<{ type: string; url: string }[]>([
    { type: "reference", url: "" },
  ]);

  // Wrap the server action so we can surface its result to the UI: jump to the
  // first step that owns a validation error and toast the outcome.
  const [state, action, pending] = useActionState<CampaignActionState, FormData>(
    async (prevState, formData) => {
      const next = await createCampaign(prevState, formData);
      if (next?.message) toast.error(next.message);
      if (next?.errors) {
        const owners = Object.keys(next.errors)
          .map((key) => FIELD_STEP[key])
          .filter((n): n is number => typeof n === "number");
        if (owners.length > 0) {
          setStep(Math.min(...owners));
          toast.error("Please fix the highlighted fields.");
        }
      }
      return next;
    },
    undefined
  );

  function set<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setTag(key: keyof typeof tags, next: string[]) {
    setTags((prev) => ({ ...prev, [key]: next }));
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function updateAsset(index: number, patch: Partial<{ type: string; url: string }>) {
    setAssets((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch } : a))
    );
  }

  const err = (key: string) => state?.errors?.[key]?.[0];

  const budgetNum = Number(values.budget) || 0;
  const rateNum = Number(values.rewardPer1k) || 0;
  const estimatedViews = rateNum > 0 ? Math.floor((budgetNum / rateNum) * 1000) : 0;

  const canFinalise = step === 8;

  return (
    <form action={action} className="space-y-6">
      {/* Stepper */}
      <ol className="flex snap-x gap-2 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <li key={label} className="snap-start">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                i === step
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-border bg-surface text-ink-500 hover:bg-surface-muted"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  i === step ? "bg-white/20" : "bg-surface-muted"
                )}
              >
                {i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Step 1 — Basics */}
          <section className={cn(step === 0 ? "space-y-5" : "hidden")}>
            <div className="space-y-2">
              <Label htmlFor="title">Campaign title</Label>
              <Input
                id="title"
                name="title"
                value={values.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Launch your tech review reels"
                maxLength={140}
              />
              <FieldError message={err("title")} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className={SELECT_CLASS}
                  value={values.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <FieldError message={err("category")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Campaign type</Label>
                <select
                  id="type"
                  name="type"
                  className={SELECT_CLASS}
                  value={values.type}
                  onChange={(e) => set("type", e.target.value)}
                >
                  {CAMPAIGN_TYPE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {CAMPAIGN_TYPE_LABEL[id]}
                    </option>
                  ))}
                </select>
                <FieldError message={err("type")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Input
                id="objective"
                name="objective"
                value={values.objective}
                onChange={(e) => set("objective", e.target.value)}
                placeholder="Drive installs for our new app"
                maxLength={500}
              />
              <FieldError message={err("objective")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Explain the campaign, the brand story and what you want creators to make."
                maxLength={5000}
              />
              <FieldError message={err("description")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Thumbnail image URL</Label>
              <Input
                id="thumbnailUrl"
                name="thumbnailUrl"
                value={values.thumbnailUrl}
                onChange={(e) => set("thumbnailUrl", e.target.value)}
                placeholder="https://..."
                inputMode="url"
                maxLength={500}
              />
              <FieldError message={err("thumbnailUrl")} />
            </div>
          </section>

          {/* Step 2 — Campaign type */}
          <section className={cn(step === 1 ? "space-y-5" : "hidden")}>
            <p className="text-sm text-ink-500">
              Choose the format that best matches your campaign. You can fine-tune
              the details in later steps.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPAIGN_TYPE_IDS.map((id) => {
                const meta = TYPE_META[id];
                const Icon = meta.icon;
                const active = values.type === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set("type", id)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                      active
                        ? "border-mint-500 bg-mint-50"
                        : "border-border bg-surface hover:bg-surface-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        active ? "bg-mint-600 text-white" : "bg-surface-muted text-ink-600"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium text-ink-900">
                        {CAMPAIGN_TYPE_LABEL[id]}
                        {active ? (
                          <Check className="h-3.5 w-3.5 text-mint-600" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {meta.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 3 — Source materials */}
          <section className={cn(step === 2 ? "space-y-5" : "hidden")}>
            <div className="flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft/40 p-4 text-xs leading-relaxed text-ink-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <p>
                Direct file uploads require storage configuration. For now, add
                reference URLs (Google Drive, Dropbox, Frame.io, etc.) so creators
                can access your source media and brand assets.
              </p>
            </div>

            <div className="space-y-3">
              {assets.map((asset, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row">
                  <select
                    name="assetType"
                    className={cn(SELECT_CLASS, "sm:w-44")}
                    value={asset.type}
                    onChange={(e) => updateAsset(index, { type: e.target.value })}
                  >
                    {ASSET_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="assetUrl"
                    value={asset.url}
                    onChange={(e) => updateAsset(index, { url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    inputMode="url"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 self-start"
                    onClick={() =>
                      setAssets((prev) =>
                        prev.length === 1
                          ? [{ type: "reference", url: "" }]
                          : prev.filter((_, i) => i !== index)
                      )
                    }
                    aria-label="Remove asset"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setAssets((prev) => [...prev, { type: "reference", url: "" }])
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add asset
              </Button>
            </div>
          </section>

          {/* Step 4 — Platforms */}
          <section className={cn(step === 3 ? "space-y-5" : "hidden")}>
            <p className="text-sm text-ink-500">
              Select at least one platform where creators can publish.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: "instagram", label: "Instagram Reels" },
                { id: "youtube", label: "YouTube Shorts" },
              ].map((p) => {
                const checked = platforms.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors",
                      checked
                        ? "border-mint-500 bg-mint-50"
                        : "border-border bg-surface hover:bg-surface-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      name="platforms"
                      value={p.id}
                      checked={checked}
                      onChange={() => togglePlatform(p.id)}
                      className="h-4 w-4 rounded border-border text-mint-600 focus:ring-mint-500"
                    />
                    <span className="font-medium text-ink-900">{p.label}</span>
                  </label>
                );
              })}
            </div>
            <FieldError message={err("platforms")} />
          </section>

          {/* Step 5 — Budget & rewards */}
          <section className={cn(step === 4 ? "space-y-5" : "hidden")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (INR)</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  value={values.budget}
                  onChange={(e) => set("budget", e.target.value)}
                  placeholder="50000"
                />
                <FieldError message={err("budget")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rewardPer1k">Reward per 1,000 views (INR)</Label>
                <Input
                  id="rewardPer1k"
                  name="rewardPer1k"
                  type="number"
                  value={values.rewardPer1k}
                  onChange={(e) => set("rewardPer1k", e.target.value)}
                  placeholder="100"
                />
                <FieldError message={err("rewardPer1k")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRewardPerSubmission">
                  Max reward per submission (INR)
                </Label>
                <Input
                  id="maxRewardPerSubmission"
                  name="maxRewardPerSubmission"
                  type="number"
                  value={values.maxRewardPerSubmission}
                  onChange={(e) => set("maxRewardPerSubmission", e.target.value)}
                  placeholder="Optional cap"
                />
                <FieldError message={err("maxRewardPerSubmission")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCampaignReward">Max campaign reward (INR)</Label>
                <Input
                  id="maxCampaignReward"
                  name="maxCampaignReward"
                  type="number"
                  value={values.maxCampaignReward}
                  onChange={(e) => set("maxCampaignReward", e.target.value)}
                  placeholder="Optional cap"
                />
                <FieldError message={err("maxCampaignReward")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minViews">Minimum views to qualify</Label>
                <Input
                  id="minViews"
                  name="minViews"
                  type="number"
                  value={values.minViews}
                  onChange={(e) => set("minViews", e.target.value)}
                  placeholder="1000"
                />
                <FieldError message={err("minViews")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSubmissionsPerCreator">
                  Max submissions per creator
                </Label>
                <Input
                  id="maxSubmissionsPerCreator"
                  name="maxSubmissionsPerCreator"
                  type="number"
                  value={values.maxSubmissionsPerCreator}
                  onChange={(e) => set("maxSubmissionsPerCreator", e.target.value)}
                  placeholder="Optional"
                />
                <FieldError message={err("maxSubmissionsPerCreator")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="maxTotalSubmissions">Max total submissions</Label>
                <Input
                  id="maxTotalSubmissions"
                  name="maxTotalSubmissions"
                  type="number"
                  value={values.maxTotalSubmissions}
                  onChange={(e) => set("maxTotalSubmissions", e.target.value)}
                  placeholder="Optional overall cap"
                />
                <FieldError message={err("maxTotalSubmissions")} />
              </div>
            </div>

            {budgetNum > 0 && rateNum > 0 ? (
              <p className="rounded-xl border border-mint-200 bg-gradient-earn-soft p-4 text-xs leading-relaxed text-ink-600">
                At {formatRupees(rateNum)} per 1,000 verified views, a{" "}
                {formatRupees(budgetNum)} budget funds roughly{" "}
                <span className="font-semibold text-ink-900">
                  {formatNumber(estimatedViews)}
                </span>{" "}
                verified views. A {PLATFORM_FEE_PERCENT}% platform fee is deducted
                from each reward.
              </p>
            ) : null}
          </section>

          {/* Step 6 — Content guidelines */}
          <section className={cn(step === 5 ? "space-y-5" : "hidden")}>
            <TagField
              name="requiredHashtags"
              label="Required hashtags"
              placeholder="#ClipSetu"
              values={tags.requiredHashtags}
              onChange={(v) => setTag("requiredHashtags", v)}
              error={err("requiredHashtags")}
            />
            <TagField
              name="requiredMentions"
              label="Required mentions"
              placeholder="@yourbrand"
              values={tags.requiredMentions}
              onChange={(v) => setTag("requiredMentions", v)}
              error={err("requiredMentions")}
            />
            <div className="space-y-2">
              <Label htmlFor="captionRequirements">Caption requirements</Label>
              <Textarea
                id="captionRequirements"
                name="captionRequirements"
                value={values.captionRequirements}
                onChange={(e) => set("captionRequirements", e.target.value)}
                maxLength={2000}
              />
              <FieldError message={err("captionRequirements")} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minDurationSeconds">Min duration (seconds)</Label>
                <Input
                  id="minDurationSeconds"
                  name="minDurationSeconds"
                  type="number"
                  value={values.minDurationSeconds}
                  onChange={(e) => set("minDurationSeconds", e.target.value)}
                  placeholder="15"
                />
                <FieldError message={err("minDurationSeconds")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDurationSeconds">Max duration (seconds)</Label>
                <Input
                  id="maxDurationSeconds"
                  name="maxDurationSeconds"
                  type="number"
                  value={values.maxDurationSeconds}
                  onChange={(e) => set("maxDurationSeconds", e.target.value)}
                  placeholder="60"
                />
                <FieldError message={err("maxDurationSeconds")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentRestrictions">Content restrictions</Label>
              <Textarea
                id="contentRestrictions"
                name="contentRestrictions"
                value={values.contentRestrictions}
                onChange={(e) => set("contentRestrictions", e.target.value)}
                maxLength={2000}
              />
              <FieldError message={err("contentRestrictions")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandatoryBranding">Mandatory branding</Label>
              <Textarea
                id="mandatoryBranding"
                name="mandatoryBranding"
                value={values.mandatoryBranding}
                onChange={(e) => set("mandatoryBranding", e.target.value)}
                maxLength={1000}
              />
              <FieldError message={err("mandatoryBranding")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prohibitedContent">Prohibited content</Label>
              <Textarea
                id="prohibitedContent"
                name="prohibitedContent"
                value={values.prohibitedContent}
                onChange={(e) => set("prohibitedContent", e.target.value)}
                maxLength={2000}
              />
              <FieldError message={err("prohibitedContent")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Content language</Label>
              <Input
                id="language"
                name="language"
                value={values.language}
                onChange={(e) => set("language", e.target.value)}
                placeholder="Hindi, English"
                maxLength={60}
              />
              <FieldError message={err("language")} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4">
              <input
                type="checkbox"
                name="disclosureRequired"
                checked={values.disclosureRequired}
                onChange={(e) => set("disclosureRequired", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-mint-600 focus:ring-mint-500"
              />
              <span>
                <span className="block font-medium text-ink-900">
                  Require paid-promotion disclosure
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  Creators must include an #ad / paid-promotion disclosure. Defaults
                  to on for compliance.
                </span>
              </span>
            </label>
          </section>

          {/* Step 7 — Audience & eligibility */}
          <section className={cn(step === 6 ? "space-y-5" : "hidden")}>
            <TagField
              name="eligibleCategories"
              label="Eligible creator categories"
              placeholder="Technology"
              hint="Leave empty to allow all creator categories."
              values={tags.eligibleCategories}
              onChange={(v) => setTag("eligibleCategories", v)}
              error={err("eligibleCategories")}
            />
            <div className="flex flex-wrap gap-2">
              {CONTENT_CATEGORIES.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setTag(
                      "eligibleCategories",
                      tags.eligibleCategories.includes(c)
                        ? tags.eligibleCategories.filter((x) => x !== c)
                        : [...tags.eligibleCategories, c]
                    )
                  }
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-600 hover:bg-surface-muted"
                >
                  + {c}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minFollowers">Minimum followers</Label>
              <Input
                id="minFollowers"
                name="minFollowers"
                type="number"
                value={values.minFollowers}
                onChange={(e) => set("minFollowers", e.target.value)}
                placeholder="Optional"
              />
              <FieldError message={err("minFollowers")} />
            </div>
            <TagField
              name="geographicRestrictions"
              label="Geographic restrictions"
              placeholder="India"
              hint="Leave empty for no geographic restriction."
              values={tags.geographicRestrictions}
              onChange={(v) => setTag("geographicRestrictions", v)}
              error={err("geographicRestrictions")}
            />
            <div className="space-y-2">
              <Label htmlFor="ageRequirement">Minimum age</Label>
              <Input
                id="ageRequirement"
                name="ageRequirement"
                type="number"
                value={values.ageRequirement}
                onChange={(e) => set("ageRequirement", e.target.value)}
                placeholder="18"
              />
              <p className="text-xs text-ink-400">
                Must be 18 or older — paid promotions are restricted to adults.
              </p>
              <FieldError message={err("ageRequirement")} />
            </div>
          </section>

          {/* Step 8 — Schedule */}
          <section className={cn(step === 7 ? "space-y-5" : "hidden")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={values.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
                <FieldError message={err("startDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={values.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
                <FieldError message={err("endDate")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="submissionDeadline">Submission deadline</Label>
                <Input
                  id="submissionDeadline"
                  name="submissionDeadline"
                  type="date"
                  value={values.submissionDeadline}
                  onChange={(e) => set("submissionDeadline", e.target.value)}
                />
                <p className="text-xs text-ink-400">
                  Must be on or before the end date.
                </p>
                <FieldError message={err("submissionDeadline")} />
              </div>
            </div>
          </section>

          {/* Step 9 — Review & publish */}
          <section className={cn(step === 8 ? "space-y-5" : "hidden")}>
            <div className="rounded-2xl border border-border-soft bg-surface-soft p-5">
              <SummaryRow label="Title" value={values.title} />
              <SummaryRow
                label="Type"
                value={CAMPAIGN_TYPE_LABEL[values.type] ?? values.type}
              />
              <SummaryRow label="Category" value={values.category} />
              <SummaryRow label="Objective" value={values.objective} />
              <SummaryRow
                label="Platforms"
                value={
                  platforms.length > 0 ? (
                    <span className="flex flex-wrap justify-end gap-1">
                      {platforms.map((p) => (
                        <Badge key={p} variant="outline" className="capitalize">
                          {p}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    ""
                  )
                }
              />
              <SummaryRow
                label="Budget"
                value={budgetNum > 0 ? formatRupees(budgetNum) : ""}
              />
              <SummaryRow
                label="Reward / 1,000 views"
                value={rateNum > 0 ? formatRupees(rateNum) : ""}
              />
              <SummaryRow
                label="Estimated verified views"
                value={estimatedViews > 0 ? formatNumber(estimatedViews) : ""}
              />
              <SummaryRow
                label="Required hashtags"
                value={tags.requiredHashtags.join(" ")}
              />
              <SummaryRow
                label="Eligible categories"
                value={tags.eligibleCategories.join(", ")}
              />
              <SummaryRow label="Start date" value={values.startDate} />
              <SummaryRow label="End date" value={values.endDate} />
              <SummaryRow
                label="Submission deadline"
                value={values.submissionDeadline}
              />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-warning-soft bg-warning-soft/40 p-4 text-xs leading-relaxed text-ink-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium text-ink-900">Publishing rules</p>
                <p>
                  Publish with a budget above ₹0 → the campaign goes to{" "}
                  <span className="font-medium">Pending payment</span> and must be
                  funded before it can go live.
                </p>
                <p>
                  Publish with a ₹0 budget → the campaign goes to{" "}
                  <span className="font-medium">Pending review</span>.
                </p>
                <p>Leave publish unchecked → the campaign is saved as a draft.</p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4">
              <input
                type="checkbox"
                name="publish"
                checked={values.publish}
                onChange={(e) => set("publish", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-mint-600 focus:ring-mint-500"
              />
              <span>
                <span className="block font-medium text-ink-900">
                  Publish this campaign
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  Uncheck to save as a draft you can finish later.
                </span>
              </span>
            </label>
            <FieldError message={err("publish")} />
          </section>
        </CardContent>

        {/* Navigation */}
        <div className="flex flex-col-reverse gap-3 border-t border-border-soft p-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-400">
              Step {step + 1} of {STEPS.length}
            </span>
            {canFinalise ? (
              <Button type="submit" disabled={pending}>
                <Rocket className="h-4 w-4" aria-hidden="true" />
                {pending ? "Saving..." : values.publish ? "Publish campaign" : "Save draft"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Your progress is kept on this page until you publish or leave.
      </p>
    </form>
  );
}
