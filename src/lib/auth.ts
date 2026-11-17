import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole =
  | "brand"
  | "clipper"
  | "admin"
  | "super_admin"
  | "moderation";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Get the current authenticated user with their role.
 * Cached per-request using React's cache().
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch profile + role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email!,
    role: (profile?.role as UserRole) ?? "clipper",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
});

/**
 * Require an authenticated session. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a specific role. Redirects to /unauthorized if not matching.
 */
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/unauthorized");
  return user;
}

/**
 * Check if the current user is an admin (admin, super_admin, or moderation).
 */
export function isAdmin(role: UserRole): boolean {
  return ["admin", "super_admin", "moderation"].includes(role);
}

/**
 * Get the admin email allowlist from env.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
