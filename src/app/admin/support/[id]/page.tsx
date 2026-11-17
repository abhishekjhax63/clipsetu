import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, MessageSquare } from "lucide-react";
import { requireStaff } from "@/lib/admin";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveAttachmentUrl } from "@/lib/support-attachments";
import { SetupNotice } from "@/components/setup-notice";
import {
  AdminPriorityBadge,
  AdminStatusBadge,
} from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatTime } from "@/lib/utils";
import { TicketControls } from "./ticket-controls";

export const metadata: Metadata = {
  title: "Support ticket",
  robots: { index: false, follow: false },
};

interface TicketRow {
  id: string;
  subject: string | null;
  category: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  guest_email: string | null;
  user_id: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  author_id: string | null;
  body: string | null;
  attachment_url: string | null;
  is_internal: boolean;
  created_at: string;
}

interface ProfileMini {
  id: string;
  email: string | null;
  full_name: string | null;
}

async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requireStaff();

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Support needs a backend">
        Ticket threads are read from Supabase. Configure your project and apply
        the migrations to view this conversation.
      </SetupNotice>
    );
  }

  const supabase = await createAdminClient();

  const { data: ticket } = (await supabase
    .from("support_tickets")
    .select(
      "id, subject, category, priority, status, assigned_to, guest_email, user_id, created_at"
    )
    .eq("id", id)
    .maybeSingle()) as { data: TicketRow | null };

  if (!ticket) notFound();

  // Staff see the FULL thread including internal notes. These must never reach
  // the end user — the user-facing page filters `is_internal = false`.
  const { data: messagesData } = (await supabase
    .from("ticket_messages")
    .select("id, author_id, body, attachment_url, is_internal, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true })) as { data: MessageRow[] | null };

  const messages = messagesData ?? [];

  // Attachments live in a private bucket; mint a short-lived signed URL each.
  const attachmentUrls = new Map<string, string>();
  await Promise.all(
    messages.map(async (message) => {
      const url = await resolveAttachmentUrl(supabase, message.attachment_url);
      if (url) attachmentUrls.set(message.id, url);
    })
  );

  const profileIds = Array.from(
    new Set(
      [
        ticket.user_id,
        ticket.assigned_to,
        ...messages.map((m) => m.author_id),
      ].filter((value): value is string => Boolean(value))
    )
  );

  const profiles = new Map<string, ProfileMini>();
  if (profileIds.length > 0) {
    const { data: profilesData } = (await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", profileIds)) as { data: ProfileMini[] | null };
    for (const profile of profilesData ?? []) {
      profiles.set(profile.id, profile);
    }
  }

  function label(userId: string | null): string {
    if (!userId) return "Guest";
    const profile = profiles.get(userId);
    return profile?.full_name ?? profile?.email ?? "Staff";
  }

  const requesterLabel = ticket.user_id
    ? label(ticket.user_id)
    : ticket.guest_email ?? "Guest";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to support
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusBadge status={ticket.status} />
          <AdminPriorityBadge priority={ticket.priority} />
          {ticket.category ? (
            <Badge variant="outline">
              {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
            </Badge>
          ) : null}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {ticket.subject ?? "Support ticket"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Requester: {requesterLabel} · Opened {formatDate(ticket.created_at)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ticket details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Requester</span>
            <span className="font-medium text-ink-900">{requesterLabel}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Assigned to</span>
            <span className="font-medium text-ink-900">
              {ticket.assigned_to ? label(ticket.assigned_to) : "Unassigned"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Category</span>
            <span className="font-medium capitalize text-ink-900">
              {ticket.category ?? "General"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">Priority</span>
            <span className="font-medium capitalize text-ink-900">
              {ticket.priority}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-ink-400" aria-hidden="true" />
            Conversation
          </CardTitle>
          <CardDescription>
            The full thread. Internal notes are visible to staff only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-ink-500">
              No messages on this ticket yet.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-2xl border p-4 ${
                  message.is_internal
                    ? "border-warning/30 bg-warning-soft/40"
                    : "border-border-soft bg-surface-soft"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                    {message.is_internal ? (
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : null}
                    {label(message.author_id)} · {formatDate(message.created_at)}{" "}
                    {formatTime(message.created_at)}
                  </p>
                  {message.is_internal ? (
                    <Badge variant="warning">Internal note</Badge>
                  ) : null}
                </div>
                {message.body ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-ink-700">
                    {message.body}
                  </p>
                ) : null}
                {attachmentUrls.get(message.id) ? (
                  <a
                    href={attachmentUrls.get(message.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 hover:underline"
                  >
                    Attachment
                  </a>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TicketControls
        ticketId={ticket.id}
        staffId={staff.id}
        status={ticket.status}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-20 w-2/3 rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TicketDetail params={params} />
    </Suspense>
  );
}
