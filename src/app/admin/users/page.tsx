import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/admin/empty-state";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { USER_ROLES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Users — Admin",
  robots: { index: false, follow: false },
};

const PAGE_LIMIT = 50;

const SELECT_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:border-mint-500";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
}

/** Prevent user input from breaking out of the PostgREST `or()` filter grammar. */
function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()]/g, " ").trim();
}

async function UsersInner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const validRole = (USER_ROLES as readonly string[]).includes(role)
    ? role
    : "";

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="User management needs a backend">
        The user directory reads live rows from Supabase. Add your project
        credentials and run the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        to manage real accounts.
      </SetupNotice>
    );
  }

  const supabase = await createAdminClient();
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, status, created_at")
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);

  const term = sanitizeSearchTerm(q);
  if (term) {
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }
  if (validRole) query = query.eq("role", validRole);

  const { data, error } = await query;
  const users = (data ?? []) as UserRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Users
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Search and manage brand, clipper and staff accounts.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form
            method="get"
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Email or full name"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:w-48">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className={SELECT_CLASS}
                defaultValue={validRole}
              >
                <option value="">All roles</option>
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="sm:w-auto">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Directory</CardTitle>
            <CardDescription>
              Showing up to {PAGE_LIMIT} accounts, newest first.
            </CardDescription>
          </div>
          <Badge variant="secondary">{users.length}</Badge>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-danger">{error.message}</p>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="No accounts match the current search and role filter."
            />
          ) : (
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Full name</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {users.map((user) => (
                    <tr key={user.id} className="align-middle">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-medium text-ink-900 underline-offset-4 hover:underline"
                        >
                          {user.email ?? "—"}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-ink-600">
                        {user.full_name ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">
                          {user.role.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <AdminStatusBadge status={user.status} />
                      </td>
                      <td className="py-3 pr-4 text-ink-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/users/${user.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <UsersInner searchParams={searchParams} />
    </Suspense>
  );
}
