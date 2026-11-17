"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface MarkReadResult {
  ok: boolean;
  message?: string;
}

const SETUP_MESSAGE =
  "Notifications need a configured backend. Add your Supabase credentials and run the migrations in supabase/migrations.";

/**
 * Mark a single notification as read. Only the owner's rows can be updated —
 * the `user_id = auth.uid()` filter is enforced here in addition to the
 * notifications_owner_all RLS policy.
 */
export async function markNotificationRead(
  id: string
): Promise<MarkReadResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const notificationId = typeof id === "string" ? id.trim() : "";
  if (!notificationId) {
    return { ok: false, message: "Missing notification reference." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "We couldn't update that notification." };
  }

  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

/** Mark every unread notification for the current user as read. */
export async function markAllRead(): Promise<MarkReadResult> {
  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    return { ok: false, message: "We couldn't mark your notifications as read." };
  }

  revalidatePath("/dashboard/notifications");
  return { ok: true };
}
