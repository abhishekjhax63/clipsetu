"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AtSign,
  Hash,
  Send,
  TriangleExclamationPoint,
} from "lucide-react";
import {
  submitClip,
  type SubmitClipState,
} from "@/app/dashboard/submissions/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { platformLabel } from "@/lib/verification";

export interface JoinedCampaignOption {
  id: string;
  title: string;
  platforms: string[];
  requiredHashtags: string[];
  requiredMentions: string[];
  /** Remaining submission slots, or null when the campaign has no limit. */
  remaining: number | null;
}

const SELECT_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:border-mint-500";

const PLACEHOLDER: Record<string, string> = {
  instagram: "https://www.instagram.com/reel/…",
  youtube: "https://www.youtube.com/shorts/…",
};

export function SubmitClipForm({
  campaigns,
  initialCampaignId,
}: {
  campaigns: JoinedCampaignOption[];
  initialCampaignId?: string;
}) {
  const [state, action, pending] = useActionState<SubmitClipState, FormData>(
    submitClip,
    undefined
  );

  const initialId =
    initialCampaignId && campaigns.some((c) => c.id === initialCampaignId)
      ? initialCampaignId
      : (campaigns[0]?.id ?? "");

  const [campaignId, setCampaignId] = useState(initialId);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  const platformOptions = useMemo(() => {
    const list = campaigns.find((c) => c.id === campaignId)?.platforms ?? [];
    return list.length > 0 ? list : ["instagram", "youtube"];
  }, [campaigns, campaignId]);

  const [platform, setPlatform] = useState(() => {
    const list = campaigns.find((c) => c.id === initialId)?.platforms ?? [];
    return (list.length > 0 ? list : ["instagram", "youtube"])[0] ?? "instagram";
  });

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="campaignId">Campaign</Label>
            <select
              id="campaignId"
              name="campaignId"
              className={SELECT_CLASS}
              value={campaignId}
              onChange={(event) => {
                const nextId = event.target.value;
                setCampaignId(nextId);
                const list =
                  campaigns.find((c) => c.id === nextId)?.platforms ?? [];
                setPlatform(
                  (list.length > 0 ? list : ["instagram", "youtube"])[0] ??
                    "instagram"
                );
              }}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                  {campaign.remaining != null
                    ? ` — ${campaign.remaining} left`
                    : ""}
                </option>
              ))}
            </select>
            {state?.errors?.campaignId ? (
              <p className="text-xs text-danger">{state.errors.campaignId[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <select
              id="platform"
              name="platform"
              className={SELECT_CLASS}
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              {platformOptions.map((value) => (
                <option key={value} value={value}>
                  {platformLabel(value)}
                </option>
              ))}
            </select>
            {state?.errors?.platform ? (
              <p className="text-xs text-danger">{state.errors.platform[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="postUrl">Published post URL</Label>
            <Input
              id="postUrl"
              name="postUrl"
              type="url"
              required
              inputMode="url"
              placeholder={PLACEHOLDER[platform] ?? "https://…"}
              autoComplete="off"
            />
            {state?.errors?.postUrl ? (
              <p className="text-xs text-danger">{state.errors.postUrl[0]}</p>
            ) : (
              <p className="text-xs text-ink-400">
                Paste the direct link to your published {platformLabel(platform)}{" "}
                clip — not a profile or a draft.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              name="caption"
              rows={4}
              maxLength={2000}
              placeholder="Paste the caption you published, for the brand's reference."
            />
            {state?.errors?.caption ? (
              <p className="text-xs text-danger">{state.errors.caption[0]}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selected &&
      (selected.requiredHashtags.length > 0 ||
        selected.requiredMentions.length > 0) ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-semibold text-ink-900">
              Required in your post
            </p>
            {selected.requiredHashtags.length > 0 ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                  <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                  Hashtags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.requiredHashtags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      <Hash className="h-3 w-3" aria-hidden="true" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {selected.requiredMentions.length > 0 ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                  <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
                  Mentions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.requiredMentions.map((mention) => (
                    <Badge key={mention} variant="outline" className="gap-1">
                      <AtSign className="h-3 w-3" aria-hidden="true" />
                      {mention}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="flex items-start gap-2.5 rounded-xl border border-border-soft bg-surface-soft p-3 text-xs text-ink-600">
              <input
                type="checkbox"
                name="confirmed"
                required
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              I have included the required hashtags and mentions in my published
              post.
            </label>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-warning/30 bg-warning-soft/40">
        <CardContent className="flex items-start gap-3 p-4">
          <TriangleExclamationPoint
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-ink-600">
            The URL you submit is <span className="font-medium">not</span> proof
            of views and does not by itself make you eligible for payment.
            Rewards are calculated only from API-verified metrics on approved
            submissions.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={pending}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {pending ? "Submitting…" : "Submit clip"}
        </Button>
      </div>
    </form>
  );
}
