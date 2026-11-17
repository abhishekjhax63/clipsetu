"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { LoaderCircle, Send, UserCheck } from "lucide-react";
import {
  adminReply,
  assignTicket,
  setTicketStatus,
  type SupportActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed",
] as const;

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState<SupportActionState, FormData>(
    adminReply,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success(state.message ?? "Message sent.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />

      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          rows={4}
          maxLength={4000}
          placeholder="Write a reply to the requester, or an internal note."
          disabled={pending}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input
          type="checkbox"
          name="isInternal"
          value="true"
          className="h-4 w-4 rounded border-border"
          disabled={pending}
        />
        Internal note (staff only — never shown to the requester, no notification)
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          Send
        </Button>
      </div>
    </form>
  );
}

function AssignForm({ ticketId, staffId }: { ticketId: string; staffId: string }) {
  const [state, action, pending] = useActionState<SupportActionState, FormData>(
    assignTicket,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success(state.message ?? "Ticket assigned.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="assignToStaffIdOrSelf" value={staffId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserCheck className="h-4 w-4" aria-hidden="true" />
        )}
        Assign to me
      </Button>
    </form>
  );
}

function StatusForm({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<SupportActionState, FormData>(
    setTicketStatus,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success(state.message ?? "Status updated.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div>
        <Label
          htmlFor={`status-${ticketId}`}
          className="mb-1 block text-xs text-ink-500"
        >
          Status
        </Label>
        <select
          id={`status-${ticketId}`}
          name="status"
          defaultValue={status}
          disabled={pending}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:border-mint-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
        >
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Update
      </Button>
    </form>
  );
}

/** Full set of staff controls for a support ticket. */
export function TicketControls({
  ticketId,
  staffId,
  status,
}: {
  ticketId: string;
  staffId: string;
  status: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <StatusForm ticketId={ticketId} status={status} />
          <AssignForm ticketId={ticketId} staffId={staffId} />
        </div>
        <div className="border-t border-border-soft pt-4">
          <ReplyForm ticketId={ticketId} />
        </div>
      </CardContent>
    </Card>
  );
}
