"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type NotificationPreferencesState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const SETUP_MESSAGE =
  "Saving preferences needs a configured backend. Add your Supabase credentials and run the migrations in supabase/migrations.";

/**
 * Upsert the signed-in user's notification preferences. The row is keyed by
 * user_id (onConflict), and the `user_id = auth.uid()` filter is enforced by the
 * notification_preferences_owner_all RLS policy.
 */
export async function updateNotificationPreferences(
  _prevState: NotificationPreferencesState,
  formData: FormData
): Promise<NotificationPreferencesState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: SETUP_MESSAGE };
  }

  const user = await requireAuth();

  const payload = {
    user_id: user.id,
    email: formData.get("email") === "on",
    in_app: formData.get("in_app") === "on",
    marketing: formData.get("marketing") === "on",
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    return {
      status: "error",
      message: "We couldn't save your preferences. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings");

  return { status: "success", message: "Notification preferences updated." };
}
