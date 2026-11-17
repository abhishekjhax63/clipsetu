import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * GET /dashboard/wallet/statement
 *
 * Streams the CURRENT user's own wallet ledger as a CSV download. Uses the
 * owner-scoped user client (RLS: wallet_transactions_select_own) — never the
 * service role, so it can only ever export the caller's own rows.
 */
interface TxnRow {
  created_at: string;
  type: string;
  direction: string;
  amount: number;
  status: string;
  description: string | null;
  idempotency_key: string | null;
  related_payment_ref: string | null;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return new Response("Statement service is not configured.", { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select(
      "created_at, type, direction, amount, status, description, idempotency_key, related_payment_ref"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response("Could not generate your statement.", { status: 500 });
  }

  const rows = (data ?? []) as TxnRow[];
  const header = [
    "date",
    "type",
    "direction",
    "amount_inr",
    "status",
    "description",
    "reference",
  ];

  const lines = [
    header,
    ...rows.map((t) => [
      t.created_at,
      t.type,
      t.direction,
      Number(t.amount).toFixed(2),
      t.status,
      t.description ?? "",
      t.related_payment_ref ?? t.idempotency_key ?? "",
    ]),
  ];

  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="clipsetu-wallet-statement.csv"',
      "Cache-Control": "no-store",
    },
  });
}
