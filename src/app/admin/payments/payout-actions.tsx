"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheckBig, LoaderCircle, RefreshCw, X } from "lucide-react";
import {
  approveWithdrawal,
  completePayout,
  failPayout,
  initiatePayout,
  markPayoutProcessing,
  rejectWithdrawal,
  type AdminPayoutActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PayoutAction = (
  prev: AdminPayoutActionState,
  formData: FormData
) => Promise<AdminPayoutActionState>;

/** Row-level controls for a single withdrawal request. */
export function PayoutActions({
  withdrawalId,
  status,
}: {
  withdrawalId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<"reject" | "fail" | "complete" | null>(null);
  const [reason, setReason] = useState("");
  const [payoutRef, setPayoutRef] = useState("");

  function run(action: PayoutAction, fields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    startTransition(async () => {
      const result = await action({ ok: true }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Withdrawal updated.");
        setPanel(null);
        setReason("");
        setPayoutRef("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not update this withdrawal.");
      }
    });
  }

  /** Informational actions (e.g. the honest "no provider" notice). */
  function inform(message: string) {
    toast.message(message);
  }

  const canApprove = status === "pending";
  const canProcess = status === "pending" || status === "approved";
  const canComplete = status === "approved" || status === "processing";
  const canResolve =
    status === "pending" || status === "approved" || status === "processing";

  if (!canResolve) {
    return <span className="text-xs text-ink-400">No actions</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {canApprove ? (
          <Button
            type="button"
            size="sm"
            variant="success"
            disabled={pending}
            onClick={() => run(approveWithdrawal, { withdrawalId })}
          >
            {pending ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CircleCheckBig className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Approve
          </Button>
        ) : null}

        {canProcess ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(markPayoutProcessing, { withdrawalId })}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Mark processing
          </Button>
        ) : null}

        {canComplete ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={pending}
            onClick={() => setPanel(panel === "complete" ? null : "complete")}
          >
            Complete payout
          </Button>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await initiatePayout(
                { ok: true },
                create("withdrawalId", withdrawalId)
              );
              if (result.message) inform(result.message);
            })
          }
        >
          Initiate payout
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setPanel(panel === "reject" ? null : "reject")}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Reject
        </Button>

        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => setPanel(panel === "fail" ? null : "fail")}
        >
          Fail
        </Button>
      </div>

      {panel === "reject" || panel === "fail" ? (
        <div className="space-y-2 rounded-xl border border-border-soft bg-surface-muted/50 p-3">
          <Label htmlFor={`reason-${withdrawalId}`}>
            {panel === "reject" ? "Rejection reason" : "Failure reason"}
          </Label>
          <Textarea
            id={`reason-${withdrawalId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Explain the decision — this is shared with the creator."
            disabled={pending}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={pending || !reason.trim()}
              onClick={() =>
                run(panel === "reject" ? rejectWithdrawal : failPayout, {
                  withdrawalId,
                  reason: reason.trim(),
                })
              }
            >
              {pending
                ? "Saving..."
                : panel === "reject"
                  ? "Reject withdrawal"
                  : "Mark failed"}
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

      {panel === "complete" ? (
        <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50 p-3">
          <Label htmlFor={`payout-ref-${withdrawalId}`}>
            Provider payout reference
          </Label>
          <Input
            id={`payout-ref-${withdrawalId}`}
            value={payoutRef}
            onChange={(event) => setPayoutRef(event.target.value)}
            placeholder="e.g. RazorpayX payout id / UTR"
            disabled={pending}
          />
          <p className="text-xs text-ink-500">
            Only record a settlement once the provider has actually paid out. This
            reference becomes the auditable payout record.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || !payoutRef.trim()}
              onClick={() =>
                run(completePayout, {
                  withdrawalId,
                  payoutRef: payoutRef.trim(),
                })
              }
            >
              {pending ? "Recording..." : "Record settlement"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setPanel(null);
                setPayoutRef("");
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

function create(key: string, value: string): FormData {
  const formData = new FormData();
  formData.set(key, value);
  return formData;
}
