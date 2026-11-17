"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Flag, LoaderCircle, RefreshCw, RotateCcw, X } from "lucide-react";
import {
  moderateSubmission,
  refreshMetricsAction,
  type ModerationActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function DecisionForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState<ModerationActionState, FormData>(
    moderateSubmission,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success(state.message ?? "Submission updated.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form
      action={action}
      className="space-y-3 rounded-2xl border border-border-soft bg-surface-muted/40 p-4"
    >
      <input type="hidden" name="submissionId" value={submissionId} />

      <div className="space-y-1.5">
        <Label htmlFor={`reason-${submissionId}`}>Reviewer notes / reason</Label>
        <Textarea
          id={`reason-${submissionId}`}
          name="reason"
          rows={3}
          maxLength={2000}
          placeholder="Explain the decision (required to reject, request a revision or flag)."
          disabled={pending}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value="approve"
          size="sm"
          variant="success"
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
          type="submit"
          name="decision"
          value="revision"
          size="sm"
          variant="secondary"
          disabled={pending}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Request revision
        </Button>
        <Button
          type="submit"
          name="decision"
          value="reject"
          size="sm"
          variant="danger"
          disabled={pending}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
        <Button
          type="submit"
          name="decision"
          value="flag"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          Flag (advisory)
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        Approving credits a reward only when the latest metrics are verified;
        otherwise the submission is marked &ldquo;metrics unavailable&rdquo; and
        nothing is credited. Flagging records an audit note, changes no outcome
        and does not notify the creator.
      </p>
    </form>
  );
}

function RefreshForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState<ModerationActionState, FormData>(
    refreshMetricsAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success(state.message ?? "Metrics refreshed.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        Refresh metrics
      </Button>
    </form>
  );
}

/** Moderation decision + metric refresh controls for a single submission. */
export function ModerationControls({ submissionId }: { submissionId: string }) {
  return (
    <div className="space-y-2">
      <DecisionForm submissionId={submissionId} />
      <RefreshForm submissionId={submissionId} />
    </div>
  );
}
