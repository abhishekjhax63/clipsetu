import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CircleCheck, Clock, Lock } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveAttachmentUrl } from "@/lib/support-attachments";
import { SetupNotice } from "@/components/setup-notice";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/status-badges";
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
import { ReplyForm } from "./reply-form";

export const metadata: Metadata = {
  title: "Support ticket",
  robots: { index: false, follow: false },
};

/** Statuses in which the customer can still add a reply. */
const REPLIABLE = new Set(["open", "in_progress"]);

const STATUS_BANNER: Record<
  string,
  { icon: LucideIcon; title: string; text: string }
> = {
  waiting_user: {
    icon: Clock,
    title: "Waiting on you",
    text: "A support agent is waiting for information from you. This thread is read-only for now — our team will reopen it when they need your reply.",
  },
  resolved: {
    icon: CircleCheck,
    title: "Resolved",
    text: "This ticket has been marked resolved and is read-only. If the issue comes back, open a new ticket.",
  },
  closed: {
    icon: Lock,
    title: "Closed",
    text: "This ticket is closed and read-only. Open a new ticket if you need more help.",
  },
};

interface TicketRow {
  id: string;
  subject: string | null;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  author_id: string | null;
  body: string | null;
  attachment_url: string | null;
  created_at: string;
}

async function TicketThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Support needs a backend">
        Ticket threads are read from Supabase. Configure your project and apply
        the migrations to view this conversation.
      </SetupNotice>
    );
  }

  const user = await requireAuth();
  const supabase = await createClient();

  const { data: ticket } = (await supabase
    .from("support_tickets")
    .select("id, subject, category, priority, status, created_at")
    .eq("id", id)
    .maybeSingle()) as { data: TicketRow | null };

  // RLS only exposes the signed-in user's own tickets; anything else is a 404.
  if (!ticket) notFound();

  // Internal support notes (is_internal) are filtered out server-side and must
  // never reach the end user.
  const { data: messagesData } = (await supabase
    .from("ticket_messages")
    .select("id, author_id, body, attachment_url, created_at")
    .eq("ticket_id", id)
    .eq("is_internal", false)
    .order("created_at", { ascending: true })) as { data: MessageRow[] | null };

  const messages = messagesData ?? [];
  const canReply = REPLIABLE.has(ticket.status);
  const banner = STATUS_BANNER[ticket.status];

  // Attachments live in a private bucket; mint a short-lived signed URL for each.
  const attachmentUrls = new Map<string, string>();
  await Promise.all(
    messages.map(async (message) => {
      const url = await resolveAttachmentUrl(supabase, message.attachment_url);
      if (url) attachmentUrls.set(message.id, url);
    })
  );

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/support"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to support
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
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
            Opened {formatDate(ticket.created_at)}
          </p>
        </div>
      </div>

      {banner ? (
        <Card className="border-warning/30 bg-warning-soft/40">
          <CardContent className="flex items-start gap-3 p-4">
            <banner.icon
              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {banner.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                {banner.text}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversation</CardTitle>
          <CardDescription>
            Messages between you and the ClipSetu support team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-ink-500">
              No messages yet on this ticket.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.author_id === user.id;
              return (
                <div
                  key={message.id}
                  className={mine ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl border p-4 ${
                      mine
                        ? "border-mint-200 bg-gradient-earn-soft"
                        : "border-border-soft bg-surface-soft"
                    }`}
                  >
                    <p className="text-xs font-medium text-ink-500">
                      {mine ? "You" : "Support team"} ·{" "}
                      {formatDate(message.created_at)}{" "}
                      {formatTime(message.created_at)}
                    </p>
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
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {canReply ? <ReplyForm ticketId={ticket.id} /> : null}
    </div>
  );
}

function ThreadSkeleton() {
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
    <Suspense fallback={<ThreadSkeleton />}>
      <TicketThread params={params} />
    </Suspense>
  );
}
