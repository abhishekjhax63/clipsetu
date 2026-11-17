"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Info, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

/** The values Razorpay hands back to the checkout `handler` on success. */
interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

interface OrderResponse {
  ok: boolean;
  orderId?: string;
  keyId?: string;
  amount?: number;
  currency?: string;
  message?: string;
}

interface VerifyResponse {
  ok: boolean;
  duplicate?: boolean;
  amount?: number;
  message?: string;
}

/** Injects the checkout script on demand; resolves false if it can't load. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function FundForm({
  campaignId,
  campaignTitle,
  stillNeeded,
}: {
  campaignId: string;
  campaignTitle: string;
  stillNeeded: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  const max = stillNeeded > 0 ? stillNeeded : undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (stillNeeded > 0 && value > stillNeeded + 0.5) {
      toast.error(`This campaign only needs ${formatINR(stillNeeded)} more.`);
      return;
    }

    setPending(true);
    try {
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, amountInr: value }),
      });
      const order = (await orderRes.json()) as OrderResponse;

      if (!order.ok || !order.orderId || !order.keyId) {
        // Surface the server's honest setup/validation message verbatim.
        toast.error(
          order.message ?? "We couldn't start the payment. Please try again."
        );
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        toast.error(
          "Could not load the payment checkout. Check your connection and try again."
        );
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount ?? Math.round(value * 100),
        currency: order.currency ?? "INR",
        name: "ClipSetu",
        description: `Funding: ${campaignTitle}`,
        order_id: order.orderId,
        handler: async (response) => {
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const result = (await verifyRes.json()) as VerifyResponse;

          if (result.ok) {
            toast.success(
              "Payment successful — your campaign budget has been funded."
            );
            setAmount("");
            router.refresh();
          } else {
            toast.error(
              result.message ??
                "We couldn't verify the payment. If you were charged, our team will reconcile it from the payment reference."
            );
          }
        },
        theme: { color: "#0b0f10" },
        modal: { ondismiss: () => setPending(false) },
      });

      checkout.on("payment.failed", () => {
        toast.error("The payment failed. You were not charged.");
      });

      checkout.open();
    } catch {
      toast.error("Something went wrong starting the payment. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fund-amount">Amount to add (INR)</Label>
        <Input
          id="fund-amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min={1}
          step="0.01"
          max={max}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          disabled={pending}
          required
        />
        <p className="text-xs text-ink-400">
          {stillNeeded > 0
            ? `This campaign needs ${formatINR(stillNeeded)} to reach its budget.`
            : "This campaign's budget is fully funded."}
        </p>
      </div>

      <Button
        type="submit"
        disabled={pending || stillNeeded <= 0}
        className="w-full sm:w-auto"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {pending ? "Opening checkout..." : "Pay with Razorpay"}
      </Button>

      <div className="flex items-start gap-2 rounded-xl border border-border-soft bg-surface-soft p-3 text-xs leading-relaxed text-ink-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          You&apos;ll complete the payment in Razorpay&apos;s secure checkout.
          Your budget is credited only after we verify the payment with the
          provider — we never simulate a successful payment.
        </span>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Card details are handled entirely by Razorpay and never reach our
        servers.
      </p>
    </form>
  );
}
