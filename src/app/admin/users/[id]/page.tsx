import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  FileText,
  NotebookPen,
  UserRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/utils";
import {
  BrandVerificationForm,
  InternalNoteForm,
  UserRoleForm,
  UserStatusForm,
} from "../user-detail-forms";

export const metadata: Metadata = {
  title: "User — Admin",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  phone: string | null;
  country: string | null;
  created_at: string;
}

interface BrandRow {
  brand_name: string | null;
  business_category: string | null;
  company_website: string | null;
  gstin: string | null;
  verification_status: string;
  rejection_reason: string | null;
}

interface CreatorRow {
  username: string | null;
  display_name: string | null;
  kyc_status: string;
  categories: string[] | null;
}

interface WalletRow {
  available: number | string;
  total_earned: number | string;
  pending: number | string;
  paid: number | string;
}

interface CampaignRow {
  id: string;
  title: string;
  status: string;
  budget: number | string;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  status: string;
  platform: string;
  submitted_at: string;
  campaigns: { title: string } | { title: string }[] | null;
}

interface AuditRow {
  id: string;
  action: string;
  actor_role: string | null;
  entity_type: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  profiles:
    | { email: string | null; full_name: string | null }
    | { email: string | null; full_name: string | null }[]
    | null;
}

function actorLabel(row: AuditRow): string {
  const rel = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
  if (rel?.full_name) return rel.full_name;
  if (rel?.email) return rel.email;
  return row.actor_role ? row.actor_role.replace(/_/g, " ") : "system";
}

function campaignTitle(row: SubmissionRow): string {
  const rel = Array.isArray(row.campaigns) ? row.campaigns[0] ?? null : row.campaigns;
  return rel?.title ?? "Campaign";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="min-w-0 text-right text-sm text-ink-900">{value}</span>
    </div>
  );
}

async function UserDetailInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="User detail needs a backend">
        This page reads live account data from Supabase. Add your project
        credentials and run the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>
        .
      </SetupNotice>
    );
  }

  if (!UUID_RE.test(id)) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={UserRound}
          title="User not found"
          description="The requested account id is not valid."
        />
      </div>
    );
  }

  const supabase = await createAdminClient();

  const [
    profileRes,
    brandRes,
    creatorRes,
    walletRes,
    campaignsRes,
    submissionsRes,
    auditRes,
    notesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, status, phone, country, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("brand_profiles")
      .select(
        "brand_name, business_category, company_website, gstin, verification_status, rejection_reason"
      )
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("creator_profiles")
      .select("username, display_name, kyc_status, categories")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("wallets")
      .select("available, total_earned, pending, paid")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("campaigns")
      .select("id, title, status, budget, created_at")
      .eq("brand_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("submissions")
      .select("id, status, platform, submitted_at, campaigns(title)")
      .eq("creator_id", id)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("audit_logs")
      .select(
        "id, action, actor_role, entity_type, created_at, metadata, profiles(email, full_name)"
      )
      .or(`actor_id.eq.${id},entity_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_logs")
      .select(
        "id, action, actor_role, entity_type, created_at, metadata, profiles(email, full_name)"
      )
      .eq("action", "internal_note")
      .eq("entity_type", "profile")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data as ProfileRow | null;
  if (!profile) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={UserRound}
          title="User not found"
          description="No profile exists for this id. It may have been removed."
        />
      </div>
    );
  }

  const brand = brandRes.data as BrandRow | null;
  const creator = creatorRes.data as CreatorRow | null;
  const wallet = walletRes.data as WalletRow | null;
  const campaigns = (campaignsRes.data ?? []) as CampaignRow[];
  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];
  const audit = (auditRes.data ?? []) as AuditRow[];
  const notes = (notesRes.data ?? []) as AuditRow[];

  return (
    <div className="space-y-8">
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {profile.email ?? "Account"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {profile.full_name ?? "No name on file"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{profile.role.replace(/_/g, " ")}</Badge>
          <AdminStatusBadge status={profile.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Base account record.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border-soft">
            <InfoRow label="Email" value={profile.email ?? "—"} />
            <InfoRow label="Full name" value={profile.full_name ?? "—"} />
            <InfoRow label="Phone" value={profile.phone ?? "—"} />
            <InfoRow label="Country" value={profile.country ?? "—"} />
            <InfoRow
              label="Created"
              value={formatDate(profile.created_at)}
            />
            <InfoRow
              label="User id"
              value={
                <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                  {profile.id}
                </code>
              }
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {brand ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Brand profile</CardTitle>
                  <CardDescription>Business details.</CardDescription>
                </div>
                <AdminStatusBadge status={brand.verification_status} />
              </CardHeader>
              <CardContent className="divide-y divide-border-soft">
                <InfoRow label="Brand name" value={brand.brand_name ?? "—"} />
                <InfoRow
                  label="Category"
                  value={brand.business_category ?? "—"}
                />
                <InfoRow
                  label="Website"
                  value={brand.company_website ?? "—"}
                />
                <InfoRow label="GSTIN" value={brand.gstin ?? "—"} />
                {brand.rejection_reason ? (
                  <InfoRow
                    label="Reason"
                    value={brand.rejection_reason}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {creator ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Creator profile</CardTitle>
                  <CardDescription>Clipper details.</CardDescription>
                </div>
                <AdminStatusBadge status={creator.kyc_status} />
              </CardHeader>
              <CardContent className="divide-y divide-border-soft">
                <InfoRow
                  label="Username"
                  value={creator.username ? `@${creator.username}` : "—"}
                />
                <InfoRow
                  label="Display name"
                  value={creator.display_name ?? "—"}
                />
                <InfoRow
                  label="Categories"
                  value={
                    creator.categories && creator.categories.length > 0
                      ? creator.categories.join(", ")
                      : "—"
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
              <CardDescription>Current balance snapshot.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border-soft">
              {wallet ? (
                <>
                  <InfoRow
                    label="Available"
                    value={formatINR(Number(wallet.available ?? 0))}
                  />
                  <InfoRow
                    label="Total earned"
                    value={formatINR(Number(wallet.total_earned ?? 0))}
                  />
                  <InfoRow
                    label="Pending"
                    value={formatINR(Number(wallet.pending ?? 0))}
                  />
                  <InfoRow
                    label="Paid out"
                    value={formatINR(Number(wallet.paid ?? 0))}
                  />
                </>
              ) : (
                <p className="py-2 text-sm text-ink-400">
                  No wallet yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {campaigns.length === 0 && submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              No campaigns or submissions on this account yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Compass}
              title="Nothing to show"
              description="This account has not created or submitted anything yet."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {campaigns.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent campaigns</CardTitle>
                <CardDescription>Latest campaigns as a brand.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border-soft">
                  {campaigns.map((campaign) => (
                    <li
                      key={campaign.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">
                          {campaign.title}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {formatINR(Number(campaign.budget ?? 0))} budget ·{" "}
                          {formatDate(campaign.created_at)}
                        </p>
                      </div>
                      <AdminStatusBadge status={campaign.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {submissions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent submissions</CardTitle>
                <CardDescription>Latest clips as a creator.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border-soft">
                  {submissions.map((submission) => (
                    <li
                      key={submission.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">
                          {campaignTitle(submission)}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-ink-400">
                          {submission.platform} ·{" "}
                          {formatDate(submission.submitted_at)}
                        </p>
                      </div>
                      <AdminStatusBadge status={submission.status} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <UserStatusForm userId={profile.id} currentStatus={profile.status} />
        <UserRoleForm
          userId={profile.id}
          currentRole={profile.role}
          actorRole={actor.role}
          isSelf={profile.id === actor.id}
        />
        {brand ? (
          <BrandVerificationForm
            userId={profile.id}
            currentStatus={brand.verification_status}
            currentReason={brand.rejection_reason}
          />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Internal notes</CardTitle>
          <CardDescription>
            Staff-only notes. Never shown to the account holder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border-soft bg-surface-soft p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-700">
              <NotebookPen className="h-4 w-4" aria-hidden="true" />
              Add a note
            </div>
            <InternalNoteForm userId={profile.id} />
          </div>

          {notes.length === 0 ? (
            <p className="text-sm text-ink-400">No internal notes yet.</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {notes.map((note) => {
                const text =
                  typeof note.metadata?.note === "string"
                    ? (note.metadata.note as string)
                    : "—";
                return (
                  <li key={note.id} className="py-3">
                    <p className="whitespace-pre-wrap text-sm text-ink-800">
                      {text}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">
                      {actorLabel(note)} ·{" "}
                      {formatDate(note.created_at, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit history</CardTitle>
          <CardDescription>
            Privileged actions by and about this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No audit entries"
              description="No privileged activity has been recorded for this account."
            />
          ) : (
            <ul className="divide-y divide-border-soft">
              {audit.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">
                      {row.action}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {actorLabel(row)}
                      {row.entity_type
                        ? ` · ${row.entity_type.replace(/_/g, " ")}`
                        : ""}
                    </p>
                  </div>
                  <time
                    dateTime={row.created_at}
                    className="shrink-0 text-xs text-ink-400"
                  >
                    {formatDate(row.created_at, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/admin/users">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All users
      </Link>
    </Button>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<UserDetailSkeleton />}>
      <UserDetailInner params={params} />
    </Suspense>
  );
}
