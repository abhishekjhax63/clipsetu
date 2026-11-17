"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
  createDispute,
  type DisputeActionState,
} from "@/app/dashboard/disputes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:border-brand-500";

const TYPES = [
  { value: "submission", label: "Submission" },
  { value: "payment", label: "Payment" },
  { value: "campaign", label: "Campaign" },
  { value: "account", label: "Account" },
];

export function DisputeForm() {
  const [state, action, pending] = useActionState<DisputeActionState, FormData>(
    createDispute,
    undefined
  );

  useEffect(() => {
    if (state?.message && !state.success) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="type">Dispute type</Label>
            <select
              id="type"
              name="type"
              className={SELECT_CLASS}
              defaultValue="submission"
            >
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {state?.errors?.type ? (
              <p className="text-xs text-danger">{state.errors.type[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaignId">Campaign ID (optional)</Label>
              <Input
                id="campaignId"
                name="campaignId"
                autoComplete="off"
                placeholder="00000000-0000-0000-0000-000000000000"
              />
              {state?.errors?.campaignId ? (
                <p className="text-xs text-danger">
                  {state.errors.campaignId[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="submissionId">Submission ID (optional)</Label>
              <Input
                id="submissionId"
                name="submissionId"
                autoComplete="off"
                placeholder="00000000-0000-0000-0000-000000000000"
              />
              {state?.errors?.submissionId ? (
                <p className="text-xs text-danger">
                  {state.errors.submissionId[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              required
              minLength={3}
              maxLength={160}
              placeholder="Short summary of the dispute"
            />
            {state?.errors?.subject ? (
              <p className="text-xs text-danger">{state.errors.subject[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              required
              rows={6}
              minLength={10}
              maxLength={4000}
              placeholder="Explain what happened and what outcome you are looking for."
            />
            {state?.errors?.description ? (
              <p className="text-xs text-danger">
                {state.errors.description[0]}
              </p>
            ) : (
              <p className="text-xs text-ink-400">10–4,000 characters.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {state?.message && !state.success ? (
        <p className="rounded-xl border border-warning/30 bg-warning-soft/40 p-3 text-xs text-ink-600">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {pending ? "Submitting…" : "Raise dispute"}
        </Button>
      </div>
    </form>
  );
}
