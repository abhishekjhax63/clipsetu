"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

export type SupportActionState =
  | { success?: boolean; message?: string }
  | undefined;

const SETUP_MESSAGE =
  "Supabase is not configured. Add your project credentials and run the migrations in supabase/migrations.";

const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed",
] as const;

interface TicketRow {
  id: string;
  user_id: string | null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateTicket(ticketId: string): void {
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
}

/**
 * Assign a ticket to a staff member. The form passes either a specific staff id
 * or the literal "self" to mean the acting staff member.
 * Assignment alone does not notify the requester.
 */
export async function assignTicket(
  _state: SupportActionState,
  formData: FormData
): Promise<SupportActionState> {
  const staff = await requireStaff();
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const ticketId = str(formData, "ticketId");
  if (!ticketId) return { message: "Missing ticket reference." };

  const requested = str(formData, "assignToStaffIdOrSelf");
  const assignedTo = !requested || requested === "self" ? staff.id : requested;

  const supabase = await createAdminClient();
  const { data: ticket } = (await supabase
    .from("support_tickets")
    .select("id, user_id")
    .eq("id", ticketId)
    .maybeSingle()) as { data: TicketRow | null };

  if (!ticket) return { message: "Ticket not found." };

  const { error } = await supabase
    .from("support_tickets")
    .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { message: error.message };

  await logAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: "support.ticket.assign",
    entityType: "support_ticket",
    entityId: ticketId,
    metadata: { assigned_to: assignedTo },
  });

  revalidateTicket(ticketId);
  return {
    success: true,
    message: assignedTo === staff.id ? "Assigned to you." : "Ticket reassigned.",
  };
}

/**
 * Move a ticket through its lifecycle. Status changes DO notify the requester
 * (when the ticket belongs to a registered user).
 */
export async function setTicketStatus(
  _state: SupportActionState,
  formData: FormData
): Promise<SupportActionState> {
  const staff = await requireStaff();
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const ticketId = str(formData, "ticketId");
  const status = str(formData, "status");

  if (!ticketId) return { message: "Missing ticket reference." };
  if (!(TICKET_STATUSES as readonly string[]).includes(status)) {
    return { message: "Choose a valid ticket status." };
  }

  const supabase = await createAdminClient();
  const { data: ticket } = (await supabase
    .from("support_tickets")
    .select("id, user_id")
    .eq("id", ticketId)
    .maybeSingle()) as { data: TicketRow | null };

  if (!ticket) return { message: "Ticket not found." };

  const { error } = await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { message: error.message };

  if (ticket.user_id) {
    await notifyUser({
      userId: ticket.user_id,
      type: "support",
      title: "Support ticket updated",
      body: `Your ticket status is now ${status.replace(/_/g, " ")}.`,
      link: "/dashboard/support",
    });
  }

  await logAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: "support.ticket.status",
    entityType: "support_ticket",
    entityId: ticketId,
    metadata: { status },
  });

  revalidateTicket(ticketId);
  return { success: true, message: `Status set to ${status.replace(/_/g, " ")}.` };
}

/**
 * Add a message to a ticket thread. Internal notes (`is_internal = true`) are
 * staff-only and NEVER notify or surface to the requester; only public replies
 * notify the ticket owner.
 */
export async function adminReply(
  _state: SupportActionState,
  formData: FormData
): Promise<SupportActionState> {
  const staff = await requireStaff();
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const ticketId = str(formData, "ticketId");
  const body = str(formData, "body");
  const isInternal = str(formData, "isInternal") === "true";

  if (!ticketId) return { message: "Missing ticket reference." };
  if (!body) return { message: "Write a reply before sending." };
  if (body.length > 4000) {
    return { message: "Please keep the message under 4,000 characters." };
  }

  const supabase = await createAdminClient();
  const { data: ticket } = (await supabase
    .from("support_tickets")
    .select("id, user_id")
    .eq("id", ticketId)
    .maybeSingle()) as { data: TicketRow | null };

  if (!ticket) return { message: "Ticket not found." };

  const { error } = await supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    author_id: staff.id,
    body,
    is_internal: isInternal,
  });

  if (error) {
    return { message: "We couldn't save the message. Please try again." };
  }

  await supabase
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (!isInternal && ticket.user_id) {
    await notifyUser({
      userId: ticket.user_id,
      type: "support",
      title: "New reply from support",
      body: body.slice(0, 280),
      link: "/dashboard/support",
    });
  }

  await logAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: isInternal ? "support.ticket.note" : "support.ticket.reply",
    entityType: "support_ticket",
    entityId: ticketId,
    metadata: { is_internal: isInternal },
  });

  revalidateTicket(ticketId);
  return {
    success: true,
    message: isInternal
      ? "Internal note added (not visible to the user)."
      : "Reply sent.",
  };
}
