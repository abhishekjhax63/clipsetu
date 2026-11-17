import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

/**
 * GET /admin/payments/export
 *
 * Streams the full wallet ledger as a CSV download for administrators. This is
 * a read-only export — the ledger is append-only and nothing here mutates it.
 *
 * Route handlers cannot use `requireAdmin()` (it redirects by throwing), so we
 * resolve the session with `getCurrentUser()` and re-check the same rule —
 * a verified staff role plus membership of the ADMIN_EMAILS allowlist.
 */
const EXPORT_LIMIT = 10_000;

interface TxnRow {
  id: string;
  user_id: string;
  type: string;
  direction: string;
  amount: number;
  status: string;
  campaign_id: string | null;
  submission_id: string | null;
  related_payment_ref: string | null;
  created_at: string;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Export service is not configured." },
        { status: 503 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isStaff = user.role === "admin" || user.role === "super_admin";
    if (!isStaff || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select(
        "id, user_id, type, direction, amount, status, campaign_id, submission_id, related_payment_ref, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(EXPORT_LIMIT);

    if (error) {
      return NextResponse.json(
        { error: "Could not generate the ledger export." },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as TxnRow[];
    const header = [
      "id",
      "user_id",
      "type",
      "direction",
      "amount",
      "status",
      "campaign_id",
      "submission_id",
      "related_payment_ref",
      "created_at",
    ];

    const lines = [
      header,
      ...rows.map((t) => [
        t.id,
        t.user_id,
        t.type,
        t.direction,
        Number(t.amount).toFixed(2),
        t.status,
        t.campaign_id ?? "",
        t.submission_id ?? "",
        t.related_payment_ref ?? "",
        t.created_at,
      ]),
    ];

    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="clipsetu-wallet-ledger.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not generate the ledger export." },
      { status: 500 }
    );
  }
}
