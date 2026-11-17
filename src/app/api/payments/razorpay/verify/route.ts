import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchOrder, verifyPaymentSignature } from "@/lib/payments/razorpay";
import { fundCampaignFromDeposit } from "@/lib/ledger";
import { notifyUser } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { formatINR } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(reason: string, message: string, status: number) {
  return NextResponse.json({ ok: false, reason, message }, { status });
}

/**
 * POST /api/payments/razorpay/verify
 *
 * Called by the checkout `handler` after a successful payment. We (1) require an
 * authenticated brand, (2) re-verify campaign ownership, (3) verify the payment
 * signature, (4) reconcile the amount with the provider (never trusting the
 * client), then (5) credit the campaign budget through the ledger. Crediting is
 * idempotent, so this is safe to call alongside the webhook.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return fail(
      "not_configured",
      "Campaign funding needs a configured backend.",
      503
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("unauthorized", "Sign in to complete this payment.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }

  const { campaignId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof campaignId !== "string" ||
    !UUID_RE.test(campaignId) ||
    typeof razorpay_order_id !== "string" ||
    !razorpay_order_id ||
    typeof razorpay_payment_id !== "string" ||
    !razorpay_payment_id ||
    typeof razorpay_signature !== "string" ||
    !razorpay_signature
  ) {
    return fail("invalid_request", "Missing payment details.", 400);
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, brand_id, title")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign || campaign.brand_id !== user.id) {
    return fail("not_found", "Campaign not found.", 404);
  }

  const signatureOk = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!signatureOk) {
    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "payment.signature_mismatch",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { orderId: razorpay_order_id },
    });
    return fail("signature_mismatch", "We couldn't verify this payment.", 400);
  }

  // Reconcile the amount and notes with the provider. NEVER trust the client's
  // amount — only the value Razorpay reports for this order is used.
  const order = await fetchOrder(razorpay_order_id);
  if (!order.ok) {
    return fail(
      order.reason,
      "We couldn't confirm the payment with the provider.",
      order.reason === "network_error" ? 502 : 500
    );
  }

  const inrAmount = order.amountPaise / 100;
  const notes = order.notes ?? {};
  const noteCampaignId = notes.campaign_id ?? notes.campaignId;
  const effectiveCampaignId =
    typeof noteCampaignId === "string" && UUID_RE.test(noteCampaignId)
      ? noteCampaignId
      : campaignId;

  // Defence in depth: a note-derived campaign must still belong to this brand.
  if (effectiveCampaignId !== campaignId) {
    const { data: noteCampaign } = await supabase
      .from("campaigns")
      .select("id, brand_id")
      .eq("id", effectiveCampaignId)
      .maybeSingle();
    if (!noteCampaign || noteCampaign.brand_id !== user.id) {
      return fail("not_found", "Campaign not found.", 404);
    }
  }

  const result = await fundCampaignFromDeposit({
    brandUserId: user.id,
    campaignId: effectiveCampaignId,
    inrAmount,
    paymentRef: razorpay_payment_id,
  });

  if (!result.ok) {
    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "payment.credit_failed",
      entityType: "campaign",
      entityId: effectiveCampaignId,
      metadata: { error: result.error, paymentId: razorpay_payment_id },
    });
    return fail(
      "ledger_error",
      "Your payment was verified but we couldn't credit the campaign yet. Our team will reconcile it from the payment reference.",
      500
    );
  }

  await notifyUser({
    userId: user.id,
    type: "campaign",
    title: "Campaign funded",
    body: `${formatINR(inrAmount)} was added to "${campaign.title}".`,
    link: `/dashboard/campaigns/${effectiveCampaignId}`,
  });

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "payment.verified",
    entityType: "campaign",
    entityId: effectiveCampaignId,
    metadata: {
      amount: inrAmount,
      paymentId: razorpay_payment_id,
      duplicate: result.duplicate ?? false,
    },
  });

  return NextResponse.json(
    { ok: true, duplicate: result.duplicate ?? false, amount: inrAmount },
    { status: 200 }
  );
}
