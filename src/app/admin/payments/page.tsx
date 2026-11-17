import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  CreditCard,
  Download,
  HandCoins,
  Receipt,
  TriangleExclamationPoint,
  Wallet,
} from "lucide-react";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TXN_TYPES } from "@/lib/constants";
import { formatDate, formatINR, formatNumber } from "@/lib/utils";
import { PayoutActions } from "./payout-actions";

export const metadata: Metadata = {
  title: "Payment administration — Admin",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TXN_STATUSES = ["pending", "completed", "failed", "reversed"] as const;

interface TxnRow {
  id: string;
  created_at: string;
  user_id: string;
  type: string;
  direction: string;
  amount: number;
  status: string;
  campaign_id: string | null;
  submission_id: string | null;
  related_payment_ref: string | null;
  profiles: { email: string | null } | { email: string | null }[] | null;
  campaigns: { title: string | null } | { title: string | null }[] | null;
}

interface WithdrawalRow {
  id: string;
  created_at: string;
  user_id: string;
  amount: number;
  status: string;
  payout_ref: string | null;
  failure_reason: string | null;
  profiles: { email: string | null } | { email: string | null }[] | null;
  bank_accounts:
    | { account_number_last4: string | null; ifsc: string | null; bank_name: string | null }
    | { account_number_last4: string | null; ifsc: string | null; bank_name: string | null }[]
    | null;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function shortId(value: string | null): string {
  if (!value) return "—";
  return `${value.slice(0, 8)}…`;
}

async function PaymentsInner({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Payment administration needs a backend">
        Payments read live ledger and withdrawal data from Supabase. Add your
        project credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to administer real payments — nothing here is faked.
      </SetupNotice>
    );
  }

  const params = await searchParams;
  const typeFilter = typeof params.type === "string" ? params.type.trim() : "";
  const statusFilter =
    typeof params.status === "string" ? params.status.trim() : "";

  const supabase = await createAdminClient();

  let txnQuery = supabase
    .from("wallet_transactions")
    .select(
      "id, created_at, user_id, type, direction, amount, status, campaign_id, submission_id, related_payment_ref, profiles(email), campaigns(title)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (typeFilter) txnQuery = txnQuery.eq("type", typeFilter);
  if (statusFilter) txnQuery = txnQuery.eq("status", statusFilter);

  const [
    txnsRes,
    withdrawalsRes,
    failedRes,
    depositsRes,
    rewardsRes,
    feesRes,
    pendingWithdrawalsRes,
  ] = await Promise.all([
    txnQuery,
    supabase
      .from("withdrawals")
      .select(
        "id, created_at, user_id, amount, status, payout_ref, failure_reason, profiles(email), bank_accounts(account_number_last4, ifsc, bank_name)"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("withdrawals")
      .select("id, created_at, user_id, amount, status, failure_reason, profiles(email)")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "deposit"),
    supabase
      .from("wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "reward"),
    supabase
      .from("wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "platform_fee"),
    supabase
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const txns = (txnsRes.data ?? []) as TxnRow[];
  const withdrawals = (withdrawalsRes.data ?? []) as WithdrawalRow[];
  const failed = (failedRes.data ?? []) as WithdrawalRow[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Payment administration
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Deposits, rewards, platform fees and creator payouts — with provider
            references.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/admin/payments/export" download>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download CSV
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Brand deposits"
          value={formatNumber(depositsRes.count ?? 0)}
        />
        <StatCard
          icon={HandCoins}
          label="Creator rewards"
          value={formatNumber(rewardsRes.count ?? 0)}
        />
        <StatCard
          icon={Receipt}
          label="Platform fees"
          value={formatNumber(feesRes.count ?? 0)}
        />
        <StatCard
          icon={CreditCard}
          label="Pending withdrawals"
          value={formatNumber(pendingWithdrawalsRes.count ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger transactions</CardTitle>
          <CardDescription>
            Brand deposits, creator rewards, platform fees and other ledger
            entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                defaultValue={typeFilter}
                className="flex h-11 w-48 rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
              >
                <option value="">All types</option>
                {TXN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="flex h-11 w-44 rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
              >
                <option value="">All statuses</option>
                {TXN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          </form>

          {txns.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description="No ledger entries match the current filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Direction</th>
                    <th className="py-2 pr-4 text-right font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Campaign</th>
                    <th className="py-2 pr-4 font-medium">Submission</th>
                    <th className="py-2 font-medium">Provider ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {txns.map((t) => {
                    const profile = firstRelation(t.profiles);
                    const campaign = firstRelation(t.campaigns);
                    return (
                      <tr key={t.id} className="align-top">
                        <td className="py-3 pr-4 text-xs text-ink-500">
                          {formatDate(t.created_at)}
                        </td>
                        <td className="py-3 pr-4 text-ink-600">
                          {profile?.email ?? shortId(t.user_id)}
                        </td>
                        <td className="py-3 pr-4 capitalize text-ink-700">
                          {t.type.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 pr-4 capitalize text-ink-600">
                          {t.direction}
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-ink-900">
                          {formatINR(Number(t.amount))}
                        </td>
                        <td className="py-3 pr-4">
                          <AdminStatusBadge status={t.status} />
                        </td>
                        <td className="py-3 pr-4 text-ink-600">
                          {campaign?.title ?? shortId(t.campaign_id)}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-ink-400">
                          {shortId(t.submission_id)}
                        </td>
                        <td className="py-3 font-mono text-xs text-ink-500">
                          {t.related_payment_ref ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal requests</CardTitle>
          <CardDescription>
            Creator payouts with their bank payout destination. Approving holds
            the funds; a completion needs a real provider reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No withdrawal requests"
              description="Creator withdrawal requests will appear here for review."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2 pr-4 font-medium">Requested</th>
                    <th className="py-2 pr-4 font-medium">Creator</th>
                    <th className="py-2 pr-4 text-right font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Bank</th>
                    <th className="py-2 pr-4 font-medium">Payout ref</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {withdrawals.map((w) => {
                    const profile = firstRelation(w.profiles);
                    const bank = firstRelation(w.bank_accounts);
                    return (
                      <tr key={w.id} className="align-top">
                        <td className="py-3 pr-4 text-xs text-ink-500">
                          {formatDate(w.created_at)}
                        </td>
                        <td className="py-3 pr-4 text-ink-600">
                          {profile?.email ?? shortId(w.user_id)}
                        </td>
                        <td className="py-3 pr-4 text-right font-medium text-ink-900">
                          {formatINR(Number(w.amount))}
                        </td>
                        <td className="py-3 pr-4">
                          <AdminStatusBadge status={w.status} />
                          {w.failure_reason ? (
                            <p className="mt-1 max-w-[14rem] text-xs text-ink-400">
                              {w.failure_reason}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-xs text-ink-500">
                          {bank
                            ? `${bank.bank_name ?? "Bank"} ····${
                                bank.account_number_last4 ?? "----"
                              }${bank.ifsc ? ` · ${bank.ifsc}` : ""}`
                            : "No bank account"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-ink-500">
                          {w.payout_ref ?? "—"}
                        </td>
                        <td className="py-3">
                          <PayoutActions withdrawalId={w.id} status={w.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={failed.length > 0 ? "border-danger/30" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleExclamationPoint
              className="h-4 w-4 text-danger"
              aria-hidden="true"
            />
            Failed payouts
          </CardTitle>
          <CardDescription>
            Payouts that failed. The ledger released the held funds back to the
            creator&apos;s available balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failed.length === 0 ? (
            <EmptyState
              icon={TriangleExclamationPoint}
              title="No failed payouts"
              description="There are no failed payout attempts right now."
            />
          ) : (
            <ul className="divide-y divide-border-soft">
              {failed.map((w) => {
                const profile = firstRelation(w.profiles);
                return (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {profile?.email ?? shortId(w.user_id)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {formatDate(w.created_at)}
                        {w.failure_reason ? ` · ${w.failure_reason}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-ink-900">
                      {formatINR(Number(w.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <PaymentsInner searchParams={searchParams} />
    </Suspense>
  );
}
