"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CircleCheckBig, Send } from "lucide-react";
import {
  submitAppeal,
  type SubmitAppealState,
} from "@/app/dashboard/submissions/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AppealForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState<SubmitAppealState, FormData>(
    submitAppeal,
    undefined
  );

  useEffect(() => {
    if (state?.message && !state.success) toast.error(state.message);
  }, [state]);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-brand-100 bg-brand-50 px-6 py-10 text-center">
        <CircleCheckBig className="h-8 w-8 text-brand-600" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink-900">Appeal submitted</p>
        <p className="mt-1 max-w-sm text-sm text-ink-600">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="submissionId" value={submissionId} />

      <div className="space-y-2">
        <Label htmlFor="reason">Why should this decision be reviewed?</Label>
        <Textarea
          id="reason"
          name="reason"
          required
          rows={5}
          minLength={10}
          maxLength={2000}
          placeholder="Explain what looks incorrect — for example, a metrics mismatch or a guideline you believe you did follow. Be specific and factual."
        />
        {state?.errors?.reason ? (
          <p className="text-xs text-danger">{state.errors.reason[0]}</p>
        ) : (
          <p className="text-xs text-ink-400">
            10–2,000 characters. One appeal per submission.
          </p>
        )}
      </div>

      {state?.message && !state.success ? (
        <p className="rounded-xl border border-warning/30 bg-warning-soft/40 p-3 text-xs text-ink-600">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? "Submitting…" : "Submit appeal"}
      </Button>
    </form>
  );
}
