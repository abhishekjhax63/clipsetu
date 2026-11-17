"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { CMS_TAG } from "@/lib/cms";

export type ContentActionState = { ok: boolean; message?: string };

const SETUP_MESSAGE =
  "Supabase is not configured. Add your project credentials and run the migrations in supabase/migrations.";

const STATUSES = ["draft", "published"] as const;

/**
 * Updates a single `cms_content` row (value + publish status).
 *
 * The value is submitted as a JSON string from the admin UI and parsed
 * server-side so malformed input is rejected with a clear error instead of
 * breaking a public page. Both the previous and new value are recorded in the
 * audit trail, and publishing expires the `cms-content` cache tag immediately
 * so the change is live on the next request.
 */
export async function updateCmsContent(
  _prev: ContentActionState,
  formData: FormData
): Promise<ContentActionState> {
  const actor = await requireAdmin();

  if (!isSupabaseConfigured()) return { ok: false, message: SETUP_MESSAGE };

  const key = String(formData.get("key") ?? "").trim();
  const rawValue = String(formData.get("value") ?? "");
  const status = String(formData.get("status") ?? "published").trim();

  if (!key) return { ok: false, message: "Missing content key." };
  if (!(STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "Invalid publish status." };
  }
  if (!rawValue.trim()) return { ok: false, message: "Enter a JSON value." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return {
      ok: false,
      message: "Invalid JSON. Fix the syntax and try again.",
    };
  }

  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("cms_content")
    .select("key, value, status")
    .eq("key", key)
    .maybeSingle();

  if (!existing) return { ok: false, message: "Content key not found." };

  const previous = existing as {
    value?: unknown;
    status?: string;
  };

  const { error } = await supabase
    .from("cms_content")
    .update({
      value: parsed,
      status,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) return { ok: false, message: error.message };

  await logAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "cms_content.update",
    entityType: "cms_content",
    entityId: key,
    metadata: {
      key,
      oldStatus: previous.status ?? null,
      newStatus: status,
      oldValue: previous.value ?? null,
      newValue: parsed,
    },
  });

  // Expire the cached public content, then refresh the affected routes.
  updateTag(CMS_TAG);
  revalidatePath("/admin/content");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message:
      status === "published"
        ? `Published ${key}.`
        : `Saved ${key} as draft (hidden from the public site).`,
  };
}
