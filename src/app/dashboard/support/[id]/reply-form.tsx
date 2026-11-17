"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Paperclip, Send } from "lucide-react";
import {
  replyToTicket,
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

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState<TicketActionState, FormData>(
    replyToTicket,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message ?? "Reply sent.");
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card>
      <CardContent className="p-6">
        <p className="mb-4 text-sm font-semibold text-ink-900">Add a reply</p>
        <form action={action} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticketId} />

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              name="body"
              required
              rows={4}
              maxLength={4000}
              placeholder="Add more detail or a follow-up question."
            />
            {state?.errors?.body ? (
              <p className="text-xs text-danger">{state.errors.body[0]}</p>
            ) : null}
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

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {pending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
