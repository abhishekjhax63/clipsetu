"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  emailLayout,
  isEmailConfigured,
  sendTransactionalEmail,
} from "@/lib/notifications";
import {
  parseExternalLink,
  uploadAttachment,
  validateAttachment,
} from "@/lib/support-attachments";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type TicketActionState =
  | {
      success?: boolean;
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

const SETUP_MESSAGE =
  "Support tickets need a configured backend. Add your Supabase credentials and run the migrations in supabase/migrations.";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@clipsetu.com";

const TICKET_CATEGORIES = [
  "general",
  "payments",
  "campaign",
  "submission",
  "account",
  "payout",
  "other",
] as const;

const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/** Statuses in which the customer may still add a reply. */
const REPLIABLE_STATUSES = ["open", "in_progress"];

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolve the optional attachment from a ticket form. A file upload wins over a
 * pasted link, but sending both is rejected so the intent stays unambiguous.
 * Files are validated and uploaded before we report any error.
 */
async function resolveAttachment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData
): Promise<
  | { ok: true; ref: string | null }
  | { ok: false; errors: Record<string, string[]> }
> {
  const link = parseExternalLink(str(formData, "attachmentUrl"));
  const file = await validateAttachment(formData.get("attachment"));

  const errors: Record<string, string[]> = {};
  if (!link.ok) {
    errors.attachmentUrl = ["Attachment link must be a secure https:// link."];
  }
  if (!file.ok) {
    errors.attachment = [file.error];
  }
  if (
    link.ok &&
    link.url &&
    file.ok &&
    file.file
  ) {
    errors.attachment = ["Attach either a file or a link, not both."];
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  if (file.ok && file.file) {
    const uploaded = await uploadAttachment(supabase, userId, file.file);
    if (!uploaded.ok) return { ok: false, errors: { attachment: [uploaded.error] } };
    return { ok: true, ref: uploaded.path };
  }

  return { ok: true, ref: link.ok ? link.url : null };
}

/** Best-effort staff email. Sends only when a real provider is configured. */
async function emailSupport(subject: string, lines: string[]): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await sendTransactionalEmail({
      to: SUPPORT_EMAIL,
      subject,
      html: emailLayout(subject, lines),
    });
  } catch {
    // Never let an email failure break the user flow.
  }
}

/**
 * Open a support ticket with an initial message. Inserted through the RLS user
 * client so `user_id` / `author_id` are always the signed-in user.
 */
export async function createTicket(
  _state: TicketActionState,
  formData: FormData
): Promise<TicketActionState> {
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const user = await requireAuth();

  const category = str(formData, "category");
  const priority = str(formData, "priority") || "medium";
  const subject = str(formData, "subject");
  const body = str(formData, "body");

  const errors: Record<string, string[]> = {};

  if (!(TICKET_CATEGORIES as readonly string[]).includes(category)) {
    errors.category = ["Choose a category for your ticket."];
  }
  if (!(TICKET_PRIORITIES as readonly string[]).includes(priority)) {
    errors.priority = ["Choose a valid priority."];
  }
  if (subject.length < 3) {
    errors.subject = ["Add a short subject (at least 3 characters)."];
  } else if (subject.length > 160) {
    errors.subject = ["Keep the subject under 160 characters."];
  }
  if (body.length < 10) {
    errors.body = ["Describe your issue in at least 10 characters."];
  } else if (body.length > 4000) {
    errors.body = ["Please keep your message under 4,000 characters."];
  }

  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();

  const attachment = await resolveAttachment(supabase, user.id, formData);
  if (!attachment.ok) return { errors: attachment.errors };
  const attachmentUrl = attachment.ref;

  const { data: ticket, error: ticketError } = (await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      category,
      priority,
      subject,
      status: "open",
    })
    .select("id")
    .single()) as { data: { id: string } | null; error: unknown };

  if (ticketError || !ticket) {
    return { message: "We couldn't open your ticket. Please try again." };
  }

  const { error: messageError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    author_id: user.id,
    body,
    is_internal: false,
    attachment_url: attachmentUrl,
  });

  if (messageError) {
    return {
      message:
        "Your ticket was created, but we couldn't save the opening message. Please add it from the ticket page.",
    };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "support.ticket.create",
    entityType: "support_ticket",
    entityId: ticket.id,
    metadata: { category, priority },
  });

  await emailSupport(`[Support] ${subject}`, [
    `New ${priority} priority support ticket (${category}).`,
    `From: ${user.email}`,
    `Subject: ${subject}`,
    "",
    body,
  ]);

  revalidatePath("/dashboard/support");
  revalidatePath(`/dashboard/support/${ticket.id}`);
  redirect(`/dashboard/support/${ticket.id}`);
}

/**
 * Add a reply to an open ticket. Internal notes (`is_internal = true`) are never
 * written or exposed here — user replies are always public messages.
 */
export async function replyToTicket(
  _state: TicketActionState,
  formData: FormData
): Promise<TicketActionState> {
  if (!isSupabaseConfigured()) return { message: SETUP_MESSAGE };

  const user = await requireAuth();

  const ticketId = str(formData, "ticketId");
  if (!ticketId) return { message: "Missing ticket reference." };

  const body = str(formData, "body");

  const errors: Record<string, string[]> = {};
  if (!body) {
    errors.body = ["Write a reply before sending."];
  } else if (body.length > 4000) {
    errors.body = ["Please keep your reply under 4,000 characters."];
  }

  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();

  // RLS only returns the user's own tickets through this client.
  const { data: ticket } = (await supabase
    .from("support_tickets")
    .select("id, status")
    .eq("id", ticketId)
    .maybeSingle()) as { data: { id: string; status: string } | null };

  if (!ticket) return { message: "Ticket not found." };
  if (!REPLIABLE_STATUSES.includes(ticket.status)) {
    return {
      message:
        "This ticket is no longer open for replies. Open a new ticket if you still need help.",
    };
  }

  const attachment = await resolveAttachment(supabase, user.id, formData);
  if (!attachment.ok) return { errors: attachment.errors };
  const attachmentUrl = attachment.ref;

  const { error } = await supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    body,
    is_internal: false,
    attachment_url: attachmentUrl,
  });

  if (error) {
    return { message: "We couldn't send your reply. Please try again." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "support.ticket.reply",
    entityType: "support_ticket",
    entityId: ticketId,
    metadata: { ticket_id: ticketId },
  });

  await emailSupport("[Support] New reply on a ticket", [
    `New reply from ${user.email}.`,
    "",
    body,
  ]);

  revalidatePath("/dashboard/support");
  revalidatePath(`/dashboard/support/${ticketId}`);

  return { success: true, message: "Reply sent." };
}
