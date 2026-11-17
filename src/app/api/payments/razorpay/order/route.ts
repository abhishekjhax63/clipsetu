import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createOrder } from "@/lib/payments/razorpay";
import { formatRupees } from "@/lib/campaigns";

/** Refuse obviously bogus funding amounts (INR). */
const MAX_FUNDING_INR = 50_000_000;
/** Paise/rounding tolerance so a to-the-paise budget can still be topped up. */
const AMOUNT_TOLERANCE_INR = 0.5;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(reason: string, message: string, status: number) {
  return NextResponse.json({ ok: false, reason, message }, { status });
}

/**
 * POST /api/payments/razorpay/order
 *
 * Creates a Razorpay order for funding a brand's own campaign. The client is
 * never trusted with the amount or the campaign ownership — both are validated
 * here against the database (RLS scopes the select to the brand's own rows).
 * Only the publishable key id is returned; the key secret never leaves the
 * server.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return fail(
      "not_configured",
      "Campaign funding needs a configured backend. Add your Supabase credentials and run the migrations.",
      503
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthorized", "Sign in to fund a campaign.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }

  const { campaignId, amountInr } = (body ?? {}) as {
    campaignId?: unknown;
    amountInr?: unknown;
  };

  if (typeof campaignId !== "string" || !UUID_RE.test(campaignId)) {
    return fail("invalid_campaign", "Campaign not found.", 400);
  }

  const amount = Number(amountInr);
  if (!Number.isFinite(amount) || amount < 1) {
    return fail("invalid_amount", "Enter a valid amount.", 400);
  }
  if (amount > MAX_FUNDING_INR) {
    return fail(
      "invalid_amount",
      "That amount exceeds the funding limit. Contact us for large campaigns.",
      400
    );
  }

  // RLS (campaigns_owner_all) restricts this select to the brand's own rows.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, brand_id, budget, funded_amount")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign || campaign.brand_id !== user.id) {
    return fail("not_found", "Campaign not found.", 404);
  }

  const stillNeeded = Math.max(
    0,
    Number(campaign.budget ?? 0) - Number(campaign.funded_amount ?? 0)
  );

  if (stillNeeded <= 0) {
    return fail(
      "fully_funded",
      "This campaign's budget is already fully funded.",
      400
    );
  }
  if (amount > stillNeeded + AMOUNT_TOLERANCE_INR) {
    return fail(
      "exceeds_budget",
      `This campaign only needs ${formatRupees(stillNeeded)} more to reach its budget.`,
      400
    );
  }

  const result = await createOrder({
    amount: Math.round(amount * 100),
    receipt: campaignId,
    notes: { campaignId, campaign_id: campaignId, brandId: user.id },
  });

  if (!result.ok) {
    if (result.reason === "not_configured") {
      return fail("not_configured", "Online payments are not enabled yet.", 503);
    }
    return fail(result.reason, result.message, 502);
  }

  return NextResponse.json(
    {
      ok: true,
      orderId: result.order.id,
      keyId: result.keyId,
      amount: result.order.amount,
      currency: result.order.currency,
    },
    { status: 200 }
  );
}
