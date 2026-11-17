"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { BadgeCheck, Banknote, Clock, Info } from "lucide-react";
import { requestPayout, type PayoutState } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";

const badgeIconClass = "h-3.5 w-3.5";

export function PayoutForm({
  kycVerified,
  isAdult,
  available,
  minWithdrawal,
}: {
  kycVerified: boolean;
  isAdult: boolean;
  available: number;
  minWithdrawal: number;
}) {
  const [state, action, pending] = useActionState<PayoutState, FormData>(
    requestPayout,
    { ok: false }
  );

  useEffect(() => {
    if (state.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  const eligible = kycVerified && isAdult;

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant={kycVerified ? "success" : "warning"}>
          {kycVerified ? (
            <BadgeCheck className={badgeIconClass} aria-hidden="true" />
          ) : (
            <Clock className={badgeIconClass} aria-hidden="true" />
          )}
          {kycVerified ? "KYC verified" : "KYC required"}
        </Badge>
        <Badge variant={isAdult ? "success" : "warning"}>
          {isAdult ? (
            <BadgeCheck className={badgeIconClass} aria-hidden="true" />
          ) : (
            <Clock className={badgeIconClass} aria-hidden="true" />
          )}
          {isAdult ? "18+ confirmed" : "Age not confirmed"}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (INR)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min={minWithdrawal}
          step="0.01"
          max={available}
          placeholder={`Minimum ${formatINR(minWithdrawal)}`}
          disabled={!eligible || pending}
          required
        />
        <p className="text-xs text-ink-400">
          Available to withdraw: {formatINR(available)} · Minimum:{" "}
          {formatINR(minWithdrawal)}
        </p>
      </div>

      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-xl border border-mint-200 bg-gradient-earn-soft p-3 text-xs text-ink-700"
              : "rounded-xl border border-warning/30 bg-warning-soft/40 p-3 text-xs text-ink-600"
          }
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={!eligible || pending}>
        <Banknote className="h-4 w-4" aria-hidden="true" />
        {pending ? "Submitting..." : "Request payout"}
      </Button>

      {!eligible ? (
        <p className="text-xs text-warning">
          Complete KYC verification and confirm you are 18 or older to request a
          payout.
        </p>
      ) : null}

      <div className="flex items-start gap-2 rounded-xl border border-border-soft bg-surface-soft p-3 text-xs leading-relaxed text-ink-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Real payouts require payment-provider approval and completed KYC.
          Requests are reviewed before any funds are released; we never simulate
          a payout.
        </span>
      </div>
    </form>
  );
}
