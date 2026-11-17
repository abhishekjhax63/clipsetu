"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, LoaderCircle, Pause, Play, X } from "lucide-react";
import {
  approveCampaign,
  cancelCampaign,
  pauseCampaign,
  rejectCampaign,
  resumeCampaign,
  type AdminCampaignActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CampaignAction = (
  prev: AdminCampaignActionState,
  formData: FormData
) => Promise<AdminCampaignActionState>;

const REVIEWABLE = ["pending_review"];
const PAUSABLE = ["active", "scheduled"];
const RESUMABLE = ["paused"];
const CANCELLABLE = [
  "draft",
  "pending_payment",
  "pending_review",
  "scheduled",
  "active",
  "paused",
];

/** Row-level moderation controls for a single campaign. */
export function CampaignRowActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<"reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");

  function run(action: CampaignAction, fields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    startTransition(async () => {
      const result = await action({ ok: true }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Campaign updated.");
        setPanel(null);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not update this campaign.");
      }
    });
  }

  const canReview = REVIEWABLE.includes(status);
  const canPause = PAUSABLE.includes(status);
  const canResume = RESUMABLE.includes(status);
  const canCancel = CANCELLABLE.includes(status);

  if (!canReview && !canPause && !canResume && !canCancel) {
    return <span className="text-xs text-ink-400">No actions</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {canReview ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="success"
              disabled={pending}
              onClick={() => run(approveCampaign, { campaignId })}
            >
              {pending ? (
                <LoaderCircle
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => setPanel(panel === "reject" ? null : "reject")}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reject
            </Button>
          </>
        ) : null}

        {canPause ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(pauseCampaign, { campaignId })}
          >
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            Pause
          </Button>
        ) : null}

        {canResume ? (
          <Button
            type="button"
            size="sm"
            variant="success"
            disabled={pending}
            onClick={() => run(resumeCampaign, { campaignId })}
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Resume
          </Button>
        ) : null}

        {canCancel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setPanel(panel === "cancel" ? null : "cancel")}
          >
            Cancel
          </Button>
        ) : null}
      </div>

      {panel ? (
        <div className="space-y-2 rounded-xl border border-border-soft bg-surface-muted/50 p-3">
          <Label htmlFor={`reason-${campaignId}`}>
            {panel === "reject" ? "Rejection reason" : "Cancellation reason"}
          </Label>
          <Textarea
            id={`reason-${campaignId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Explain the decision — this is shared with the brand."
            disabled={pending}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={panel === "reject" ? "danger" : "default"}
              disabled={pending || !reason.trim()}
              onClick={() =>
                run(panel === "reject" ? rejectCampaign : cancelCampaign, {
                  campaignId,
                  reason: reason.trim(),
                })
              }
            >
              {pending ? "Saving..." : panel === "reject" ? "Reject" : "Cancel campaign"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setPanel(null);
                setReason("");
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
