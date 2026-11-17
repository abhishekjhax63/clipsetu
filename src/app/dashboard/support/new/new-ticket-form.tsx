"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Paperclip, Send } from "lucide-react";
import {
  createTicket,
  type TicketActionState,
} from "@/app/dashboard/support/actions";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
} from "@/lib/support-attachments";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:border-brand-500";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "payments", label: "Payments" },
  { value: "campaign", label: "Campaign" },
  { value: "submission", label: "Submission" },
  { value: "account", label: "Account" },
  { value: "payout", label: "Payout" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function NewTicketForm() {
  const [state, action, pending] = useActionState<TicketActionState, FormData>(
    createTicket,
    undefined
  );

  useEffect(() => {
    if (state?.message && !state.success) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                className={SELECT_CLASS}
                defaultValue="general"
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {state?.errors?.category ? (
                <p className="text-xs text-danger">{state.errors.category[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                className={SELECT_CLASS}
                defaultValue="medium"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              {state?.errors?.priority ? (
                <p className="text-xs text-danger">{state.errors.priority[0]}</p>
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
              placeholder="Short summary of your issue"
            />
            {state?.errors?.subject ? (
              <p className="text-xs text-danger">{state.errors.subject[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">How can we help?</Label>
            <Textarea
              id="body"
              name="body"
              required
              rows={6}
              minLength={10}
              maxLength={4000}
              placeholder="Describe what happened, including any campaign, submission or payout reference."
            />
            {state?.errors?.body ? (
              <p className="text-xs text-danger">{state.errors.body[0]}</p>
            ) : (
              <p className="text-xs text-ink-400">10–4,000 characters.</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="attachment" className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                Attachment (optional)
              </Label>
              <Input
                id="attachment"
                name="attachment"
                type="file"
                accept={ATTACHMENT_ACCEPT}
                className="file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              />
              {state?.errors?.attachment ? (
                <p className="text-xs text-danger">
                  {state.errors.attachment[0]}
                </p>
              ) : (
                <p className="text-xs text-ink-400">{ATTACHMENT_HINT}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="attachmentUrl"
                className="text-xs font-normal text-ink-500"
              >
                …or paste a secure https:// link
              </Label>
              <Input
                id="attachmentUrl"
                name="attachmentUrl"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://…"
              />
              {state?.errors?.attachmentUrl ? (
                <p className="text-xs text-danger">
                  {state.errors.attachmentUrl[0]}
                </p>
              ) : null}
            </div>
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
          {pending ? "Submitting…" : "Open ticket"}
        </Button>
      </div>
    </form>
  );
}
