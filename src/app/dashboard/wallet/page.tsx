import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Clock,
  Compass,
  Download,
  Info,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { isAdmin, requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isLedgerConfigured } from "@/lib/ledger";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_WITHDRAWAL_INR } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/utils";
import { PayoutForm } from "./payout-form";

export const metadata: Metadata = {
  title: "Wallet",
  robots: { index: false, follow: false },
};

const TXN_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  reversed: "Reversed",
};

const TXN_STATUS_TONE: Record<string, BadgeProps["variant"]> = {
  pending: "warning",
  completed: "success",
  failed: "danger",
  reversed: "secondary",
};

const WITHDRAWAL_TONE: Record<string, BadgeProps["variant"]> = {
  pending: "warning",
  approved: "info",
  processing: "info",
  completed: "success",
  failed: "danger",
  rejected: "danger",
};

function isAdult(iso: string | null): boolean {
  if (!iso) return false;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

interface WalletRow {
  total_earned: number;
  available: number;
  pending: number;
  under_review: number;
  paid: number;
  reversed: number;
}

interface TxnRow {
  id: string;
  type: string;
  direction: string;
  amount: number;
  status: string;
  description: string | null;
  related_payment_ref: string | null;
  created_at: string;
}

interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  payout_ref: string | null;
  failure_reason: string | null;
  created_at: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-500">{label}</span>
          <Icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
        </div>
        <p className="mt-3 text-xl font-bold tracking-tight text-ink-900">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function StatementLink() {
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href="/dashboard/wallet/statement" prefetch={false}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Download statement (CSV)
      </Link>
    </Button>
  );
}

function LedgerNotice() {
  return (
    <SetupNotice title="Payouts & funding need the service-role key">
      Your balances below are read from Supabase, but writing to the ledger
      (payouts and campaign funding) requires the{" "}
      <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
        SUPABASE_SERVICE_ROLE_KEY
      </code>{" "}
      plus a configured payment provider. Until then, money movement is
      disabled — nothing is simulated.
    </SetupNotice>
  );
}

function TxnList({ txns }: { txns: TxnRow[] }) {
  if (txns.length === 0) {
    return (
      <p className="text-sm text-ink-400">No wallet activity recorded yet.</p>
    );
  }
  return (
    <ul className="divide-y divide-border-soft">
      {txns.map((t) => {
        const credit = t.direction === "credit";
        return (
          <li
            key={t.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium capitalize text-ink-900">
                {t.type.replace(/_/g, " ")}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-400">
                {t.description ?? "—"} · {formatDate(t.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={
                  credit
                    ? "text-sm font-semibold tabular-nums text-mint-700"
                    : "text-sm font-semibold tabular-nums text-ink-900"
                }
              >
                {credit ? "+" : "−"}
                {formatINR(Number(t.amount))}
              </span>
              <Badge variant={TXN_STATUS_TONE[t.status] ?? "secondary"}>
                {TXN_STATUS_LABEL[t.status] ?? t.status}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function ClipperWallet({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [profileRes, walletRes, txnsRes, withdrawalsRes] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select("kyc_status, date_of_birth")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("wallets")
      .select("total_earned, available, pending, under_review, paid, reversed")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select(
        "id, type, direction, amount, status, description, related_payment_ref, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("withdrawals")
      .select("id, amount, status, payout_ref, failure_reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = profileRes.data as {
    kyc_status: string;
    date_of_birth: string | null;
  } | null;
  const wallet = walletRes.data as WalletRow | null;
  const txns = (txnsRes.data ?? []) as TxnRow[];
  const withdrawals = (withdrawalsRes.data ?? []) as WithdrawalRow[];

  const kycVerified = profile?.kyc_status === "verified";
  const adult = isAdult(profile?.date_of_birth ?? null);
  const available = Number(wallet?.available ?? 0);
  const ledgerReady = isLedgerConfigured();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Wallet
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Your earnings, ledger history and payout requests.
          </p>
        </div>
        <StatementLink />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Available"
          value={formatINR(available)}
          hint="Withdrawable now"
        />
        <StatCard
          icon={TrendingUp}
          label="Total earned"
          value={formatINR(Number(wallet?.total_earned ?? 0))}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={formatINR(Number(wallet?.pending ?? 0))}
          hint="Awaiting verification"
        />
        <StatCard
          icon={Banknote}
          label="Paid out"
          value={formatINR(Number(wallet?.paid ?? 0))}
        />
        <StatCard
          icon={ShieldCheck}
          label="Under review"
          value={formatINR(Number(wallet?.under_review ?? 0))}
        />
        <StatCard
          icon={Info}
          label="Reversed"
          value={formatINR(Number(wallet?.reversed ?? 0))}
          hint="Reclaimed from fraud or disputes"
        />
      </div>

      {!ledgerReady ? <LedgerNotice /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Request a payout</CardTitle>
          <CardDescription>
            Withdraw your available balance to your bank account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayoutForm
            kycVerified={kycVerified}
            isAdult={adult}
            available={available}
            minWithdrawal={MIN_WITHDRAWAL_INR}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout requests</CardTitle>
          <CardDescription>
            Withdrawals you have requested and their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-ink-400">No payout requests yet.</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {withdrawals.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums text-ink-900">
                      {formatINR(Number(w.amount))}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {formatDate(w.created_at)}
                      {w.payout_ref ? ` · Ref ${w.payout_ref}` : ""}
                    </p>
                    {w.failure_reason ? (
                      <p className="mt-0.5 text-xs text-danger">
                        {w.failure_reason}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={WITHDRAWAL_TONE[w.status] ?? "secondary"}>
                    {w.status.replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <CardDescription>
            Every credit and debit in your ledger, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TxnList txns={txns} />
        </CardContent>
      </Card>
    </div>
  );
}

async function BrandWallet({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("wallet_transactions")
    .select(
      "id, type, direction, amount, status, description, related_payment_ref, created_at"
    )
    .eq("user_id", userId)
    .eq("type", "deposit")
    .order("created_at", { ascending: false })
    .limit(50);

  const deposits = (data ?? []) as TxnRow[];
  const totalFunded = deposits
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + Number(d.amount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Wallet
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Campaign funding and deposit history.
          </p>
        </div>
        <StatementLink />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={TrendingUp}
          label="Total funded"
          value={formatINR(totalFunded)}
          hint="Completed deposits"
        />
        <StatCard
          icon={Wallet}
          label="Deposits"
          value={String(deposits.length)}
          hint="Funding transactions recorded"
        />
      </div>

      {!isLedgerConfigured() ? <LedgerNotice /> : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Fund a campaign</CardTitle>
            <CardDescription>
              Add budget to a campaign so it can pay creator rewards.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/campaigns">
              <Compass className="h-4 w-4" aria-hidden="true" />
              View campaigns
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-xl border border-border-soft bg-surface-soft p-4 text-sm leading-relaxed text-ink-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Open a campaign and use <strong>Fund campaign</strong> to add its
              budget. Deposits are processed through Razorpay and only credited
              once the payment is verified — nothing is faked.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deposit history</CardTitle>
          <CardDescription>
            Verified funding deposits across your campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TxnList txns={deposits} />
        </CardContent>
      </Card>
    </div>
  );
}

async function WalletOverview() {
  const user = await requireAuth();

  if (isAdmin(user.role)) redirect("/admin");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Wallet needs a backend">
        Your wallet reads live balances and ledger history from Supabase. Add
        your project credentials and apply the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to see real data — nothing here is faked.
      </SetupNotice>
    );
  }

  return user.role === "brand" ? (
    <BrandWallet userId={user.id} />
  ) : (
    <ClipperWallet userId={user.id} />
  );
}

function WalletSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<WalletSkeleton />}>
      <WalletOverview />
    </Suspense>
  );
}
