/**
 * Append-only audit logging for privileged actions.
 *
 * Uses the service-role client because audit_logs has no end-user INSERT policy.
 * Auditing must never break the user flow, so failures are swallowed — but the
 * caller can check `isAuditConfigured()` to surface a setup requirement.
 */
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  /** Dotted action name, e.g. "campaign.approve", "user.suspend". */
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function isAuditConfigured(): boolean {
  return (
    isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  if (!isAuditConfigured()) return;

  try {
    const supabase = await createAdminClient();
    await supabase.from("audit_logs").insert({
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch {
    // Never let an audit failure break the primary action.
  }
}
