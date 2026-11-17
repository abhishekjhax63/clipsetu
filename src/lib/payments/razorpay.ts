/**
 * Razorpay integration (server-only).
 *
 * Implements the real interfaces: order creation via the Razorpay REST API,
 * payment signature verification and webhook signature verification. All
 * signature checks use the provider's documented HMAC-SHA256 scheme.
 *
 * When credentials are absent every function returns an explicit "not
 * configured" result — we never fabricate a successful payment.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
}

export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

export interface CreatedOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
}

export type CreateOrderResult =
  | { ok: true; order: CreatedOrder; keyId: string }
  | { ok: false; reason: "not_configured" | "provider_error" | "network_error"; message: string };

/**
 * Creates a Razorpay order. `amount` must be in paise (INR × 100). Server-side
 * only — the key secret never leaves the server.
 */
export async function createOrder(input: {
  /** Amount in paise. */
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResult> {
  if (!isRazorpayConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Online payments are not enabled. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (and complete provider onboarding) to enable brand funding.",
    };
  }

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(input.amount),
        currency: "INR",
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        reason: "provider_error",
        message: "The payment provider rejected the order request.",
      };
    }

    const order = (await res.json()) as CreatedOrder;
    return { ok: true, order, keyId: process.env.RAZORPAY_KEY_ID! };
  } catch {
    return {
      ok: false,
      reason: "network_error",
      message: "Could not reach the payment provider. Please try again.",
    };
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verifies the checkout payment signature: HMAC_SHA256(order_id|payment_id). */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return safeEqual(expected, input.signature);
}

/** Verifies a Razorpay webhook signature over the raw request body. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export type FetchOrderResult =
  | {
      ok: true;
      amountPaise: number;
      currency: string;
      notes: Record<string, string>;
    }
  | { ok: false; reason: "not_configured" | "provider_error" | "network_error" };

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string> | null;
}

/**
 * Fetches an existing order from Razorpay so callers can reconcile the amount
 * server-side. NEVER trust a client-supplied amount — the value returned here
 * comes straight from the provider. Server-only.
 */
export async function fetchOrder(orderId: string): Promise<FetchOrderResult> {
  if (!isRazorpayConfigured()) return { ok: false, reason: "not_configured" };

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  try {
    const res = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`,
      {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }
    );

    if (!res.ok) return { ok: false, reason: "provider_error" };

    const order = (await res.json()) as RazorpayOrderResponse;
    return {
      ok: true,
      amountPaise: Number(order.amount),
      currency: order.currency,
      notes: order.notes ?? {},
    };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
