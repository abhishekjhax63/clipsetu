"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, LoaderCircle, RotateCcw, X } from "lucide-react";
import {
  reviewSubmission,
  type ReviewDecision,
} from "@/app/dashboard/campaigns/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Approve / reject / request-revision controls for a single submission.
 *
 * Approving only credits a reward when api-verified metrics exist — see the
 * `reviewSubmission` server action. When no verified metrics are available the
 * submission is marked "metrics unavailable" and nothing is credited.
 */
export function SubmissionReviewControls({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function decide(decision: ReviewDecision) {
    if (decision !== "approve" && !notes.trim()) {
      toast.error(
        decision === "reject"
          ? "Add a short reason before rejecting."
          : "Add guidance for the creator before requesting changes."
      );
      return;
    }

    startTransition(async () => {
      const result = await reviewSubmission(submissionId, decision, notes);
      if (result.ok) {
        toast.success(result.message ?? "Submission updated.");
        setNotes("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not update this submission.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border-soft bg-surface-muted/40 p-4">
      <div className="space-y-1.5">
        <Label htmlFor={`review-notes-${submissionId}`}>Review notes</Label>
        <Textarea
          id={`review-notes-${submissionId}`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Explain your decision (required to reject or request changes)."
          rows={3}
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="success"
          onClick={() => decide("approve")}
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => decide("request_revision")}
          disabled={pending}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Request revision
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => decide("reject")}
          disabled={pending}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
      </div>
      <p className="text-xs text-ink-400">
        Approving credits a reward only when verified view metrics exist. If none
        are available, the submission is marked &ldquo;metrics unavailable&rdquo;
        and nothing is credited.
      </p>
    </div>
  );
}
