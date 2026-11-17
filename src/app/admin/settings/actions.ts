"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type SettingActionState = { ok: boolean; message?: string };

const SETUP_MESSAGE =
  "Supabase is not configured. Add your project credentials and run the migrations in supabase/migrations.";

/**
 * Updates a single `platform_settings` row. The value is submitted as a JSON
 * string from the admin UI and parsed server-side so malformed input is
 * rejected with a clear error instead of corrupting configuration.
 *
 * Sensitive rows (`is_sensitive = true`) may only be changed by a super admin.
 */
export async function updatePlatformSetting(
  _prev: SettingActionState,
  formData: FormData
): Promise<SettingActionState> {
  const actor = await requireAdmin();

  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const key = String(formData.get("key") ?? "").trim();
  const rawValue = String(formData.get("value") ?? "");

  if (!key) return { ok: false, message: "Missing setting key." };
  if (!rawValue.trim()) return { ok: false, message: "Enter a JSON value." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return {
      ok: false,
      message:
        'Invalid JSON. Examples: 10, "INR", ["instagram","youtube"].',
    };
  }

  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("platform_settings")
    .select("key, value, is_sensitive")
    .eq("key", key)
    .maybeSingle();

  if (!existing) return { ok: false, message: "Setting not found." };

  const sensitive = Boolean(
    (existing as { is_sensitive?: boolean }).is_sensitive
  );
  if (sensitive && actor.role !== "super_admin") {
    return {
      ok: false,
      message: "Only a super admin can change sensitive settings.",
    };
  }

  const { error } = await supabase
    .from("platform_settings")
    .update({
      value: parsed,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) return { ok: false, message: error.message };

  // Always record both the previous and new value so sensitive changes are
  // fully attributable.
  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "platform_setting.update",
    entityType: "platform_setting",
    entityId: null,
    metadata: {
      key,
      isSensitive: sensitive,
      oldValue: (existing as { value?: unknown }).value ?? null,
      newValue: parsed,
    },
  });

  revalidatePath("/admin/settings");
  return { ok: true, message: `Updated ${key}.` };
}
