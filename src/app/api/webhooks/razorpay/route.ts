import { NextResponse } from "next/server";
import { fetchOrder, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fundCampaignFromDeposit } from "@/lib/ledger";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { formatINR } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RazorpayEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  notes?: Record<string, string> | null;
  error_description?: string;
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    order?: { entity?: RazorpayEntity };
  };
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

/** Reads the first non-empty value among the accepted note keys. */
function noteValue(
  notes: Record<string, string> | null | undefined,
  ...keys: string[]
): string | null {
  if (!notes) return null;
  for (const key of keys) {
    const value = notes[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Resolves the funding brand from the order notes, falling back to a lookup. */
async function resolveBrandId(
  notes: Record<string, string> | null | undefined,
  campaignId: string | null
): Promise<string | null> {
  const fromNotes = noteValue(notes, "brandId", "brand_id");
  if (fromNotes) return fromNotes;
  if (!campaignId || !isSupabaseConfigured()) return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("campaigns")
    .select("brand_id")
    .eq("id", campaignId)
    .maybeSingle();
  return (data?.brand_id as string | undefined) ?? null;
}

/**
 * POST /api/webhooks/razorpay
 *
 * Verifies the webhook signature over the RAW body, then reconciles funding.
 * The amount is always taken from the provider (via fetchOrder) — the webhook's
 * own amount is never trusted. Crediting is idempotent on the payment id, so a
 * duplicate delivery is a safe no-op.
 */
export async function POST(request: Request): Promise<Response> {
  // Read the raw body BEFORE any JSON parsing — the HMAC is over the raw bytes.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_signature" },
      { status: 400 }
    );
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_body" },
      { status: 400 }
    );
  }

  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;

  switch (event.event) {
    case "payment.captured":
    case "order.paid": {
      const orderId = paymentEntity?.order_id ?? orderEntity?.id ?? null;
      const paymentId = paymentEntity?.id ?? null;
      const notes = paymentEntity?.notes ?? orderEntity?.notes ?? null;
      const campaignId = uuid(noteValue(notes, "campaign_id", "campaignId"));
      const paymentRef = paymentId ?? orderId;

      if (!orderId || !paymentRef || !campaignId) {
        await logAudit({
          action: "webhook.razorpay.unresolved",
          entityType: "campaign",
          metadata: { event: event.event, orderId, paymentId },
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Confirm the amount with the provider; never trust the webhook's amount.
      const order = await fetchOrder(orderId);
      if (!order.ok) {
        await logAudit({
          action: "webhook.razorpay.unconfirmed",
          entityType: "campaign",
          entityId: campaignId,
          metadata: { event: event.event, orderId, reason: order.reason },
        });
        // A transient provider/network failure should be retried by Razorpay.
        const status = order.reason === "network_error" ? 500 : 200;
        return NextResponse.json({ received: status === 200 }, { status });
      }

      const inrAmount = order.amountPaise / 100;
      const brandUserId = await resolveBrandId(
        order.notes ?? notes,
        campaignId
      );

      if (!brandUserId) {
        await logAudit({
          action: "webhook.razorpay.unresolved_brand",
          entityType: "campaign",
          entityId: campaignId,
          metadata: { event: event.event, orderId },
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const result = await fundCampaignFromDeposit({
        brandUserId,
        campaignId,
        inrAmount,
        paymentRef,
      });

      if (!result.ok) {
        await logAudit({
          action: "webhook.razorpay.credit_failed",
          entityType: "campaign",
          entityId: campaignId,
          metadata: { event: event.event, orderId, error: result.error },
        });
        // Crediting is idempotent, so a provider retry is safe.
        return NextResponse.json(
          { received: false, reason: "ledger_error" },
          { status: 500 }
        );
      }

      if (!result.duplicate) {
        await notifyUser({
          userId: brandUserId,
          type: "campaign",
          title: "Campaign funded",
          body: `${formatINR(inrAmount)} was added to your campaign budget.`,
          link: `/dashboard/campaigns/${campaignId}`,
        });
      }

      await logAudit({
        action: "webhook.razorpay.reconciled",
        entityType: "campaign",
        entityId: campaignId,
        metadata: {
          event: event.event,
          paymentId: paymentRef,
          amount: inrAmount,
          duplicate: result.duplicate ?? false,
        },
      });

      return NextResponse.json({ received: true }, { status: 200 });
    }

    case "payment.failed": {
      const notes = paymentEntity?.notes ?? null;
      const campaignId = uuid(noteValue(notes, "campaign_id", "campaignId"));
      const brandUserId = campaignId
        ? await resolveBrandId(notes, campaignId)
        : null;
      const reason =
        paymentEntity?.error_description ?? "The payment did not go through.";

      if (brandUserId) {
        await notifyUser({
          userId: brandUserId,
          type: "campaign",
          title: "Payment failed",
          body: `A campaign funding payment failed: ${reason} You were not charged.`,
          link: campaignId
            ? `/dashboard/campaigns/${campaignId}/fund`
            : "/dashboard/wallet",
        });
      }

      await logAudit({
        action: "webhook.razorpay.payment_failed",
        entityType: "campaign",
        entityId: campaignId ?? null,
        metadata: { paymentId: paymentEntity?.id ?? null, reason },
      });

      return NextResponse.json({ received: true }, { status: 200 });
    }

    default:
      // Acknowledge recognised-but-unhandled events so Razorpay stops retrying.
      return NextResponse.json({ received: true }, { status: 200 });
  }
}
