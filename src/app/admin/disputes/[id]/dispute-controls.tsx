"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { LoaderCircle, Scale, UserCheck } from "lucide-react";
import {
  assignDispute,
  resolveDispute,
  type DisputeActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RESOLUTION_STATUSES = ["in_review", "resolved", "rejected"] as const;

function AssignDisputeForm({ disputeId }: { disputeId: string }) {
  const [state, action, pending] = useActionState<DisputeActionState, FormData>(
    assignDispute,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success(state.message ?? "Dispute assigned.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="disputeId" value={disputeId} />
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

function ResolveDisputeForm({
  disputeId,
  status,
  resolution,
}: {
  disputeId: string;
  status: string;
  resolution: string | null;
}) {
  const [state, action, pending] = useActionState<DisputeActionState, FormData>(
    resolveDispute,
    undefined
  );

  useEffect(() => {
    if (state?.success) toast.success(state.message ?? "Dispute updated.");
    else if (state?.message) toast.error(state.message);
  }, [state]);

  const defaultStatus = (RESOLUTION_STATUSES as readonly string[]).includes(
    status
  )
    ? status
    : "in_review";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="disputeId" value={disputeId} />

      <div className="space-y-1.5">
        <Label htmlFor={`resolution-${disputeId}`}>Resolution</Label>
        <Textarea
          id={`resolution-${disputeId}`}
          name="resolution"
          rows={4}
          maxLength={4000}
          defaultValue={resolution ?? ""}
          placeholder="Explain the outcome of this dispute (required to resolve or reject)."
          disabled={pending}
        />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label
            htmlFor={`dispute-status-${disputeId}`}
            className="mb-1 block text-xs text-ink-500"
          >
            Decision
          </Label>
          <select
            id={`dispute-status-${disputeId}`}
            name="status"
            defaultValue={defaultStatus}
            disabled={pending}
            className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25"
          >
            {RESOLUTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Save decision
        </Button>
      </div>
    </form>
  );
}

/** Staff controls for a single dispute. */
export function DisputeControls({
  disputeId,
  status,
  resolution,
}: {
  disputeId: string;
  status: string;
  resolution: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-ink-400" aria-hidden="true" />
          Review decision
        </CardTitle>
        <AssignDisputeForm disputeId={disputeId} />
      </CardHeader>
      <CardContent>
        <ResolveDisputeForm
          disputeId={disputeId}
          status={status}
          resolution={resolution}
        />
      </CardContent>
    </Card>
  );
}
