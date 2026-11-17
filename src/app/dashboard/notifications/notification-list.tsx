"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  FileCheck,
  Gift,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markAllRead, markNotificationRead } from "./actions";

export interface NotificationItemView {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  link: string | null;
  read: boolean;
  /** Relative time pre-formatted on the server (keeps the client render pure). */
  when: string;
}

const TYPE_ICON: Record<string, LucideIcon> = {
  campaign: Megaphone,
  submission: FileCheck,
  reward: Gift,
  payout: Wallet,
  verification: ShieldCheck,
  security: ShieldCheck,
  support: LifeBuoy,
  system: Bell,
};

/**
 * Only same-origin, relative links are safe to render. Anything that is not a
 * single-leading-slash path (protocol-relative `//`, absolute URLs, mailto,
 * javascript: etc.) is ignored.
 */
function safeInternalLink(link: string | null): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

export function NotificationList({
  items,
}: {
  items: NotificationItemView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>(
    {}
  );

  const isRead = (item: NotificationItemView) =>
    readOverrides[item.id] ?? item.read;
  const unreadCount = items.filter((item) => !isRead(item)).length;

  function handleMarkAll() {
    if (unreadCount === 0) return;
    setReadOverrides(Object.fromEntries(items.map((item) => [item.id, true])));
    startTransition(async () => {
      const result = await markAllRead();
      if (!result.ok) {
        setReadOverrides({});
        toast.error(
          result.message ?? "We couldn't mark your notifications as read."
        );
      }
    });
  }

  function handleMarkOne(id: string) {
    setReadOverrides((prev) => ({ ...prev, [id]: true }));
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (!result.ok) {
        setReadOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.error(result.message ?? "We couldn't update that notification.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant={unreadCount > 0 ? "info" : "secondary"}>
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </Badge>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleMarkAll}
          disabled={isPending || unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Mark all as read
        </Button>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const Icon = TYPE_ICON[item.type] ?? Bell;
          const read = isRead(item);
          const href = safeInternalLink(item.link);
          return (
            <li key={item.id}>
              <div
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 transition-colors",
                  read
                    ? "border-border-soft bg-surface"
                    : "border-brand-200 bg-brand-50"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    read
                      ? "bg-surface-muted text-ink-400"
                      : "bg-brand-100 text-brand-700"
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!read ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-brand-600"
                        role="img"
                        aria-label="Unread"
                      />
                    ) : null}
                    <p className="truncate font-semibold text-ink-900">
                      {item.title ?? "Notification"}
                    </p>
                  </div>

                  {item.body ? (
                    <p className="mt-1 text-sm text-ink-600">{item.body}</p>
                  ) : null}

                  <div className="mt-2 flex items-center gap-3 text-xs text-ink-400">
                    <span>{item.when}</span>
                    {href ? (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 font-medium text-ink-600 transition-colors hover:text-ink-900 hover:underline"
                      >
                        View
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </div>

                {!read ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkOne(item.id)}
                    disabled={isPending}
                    className="shrink-0"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Read
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
