import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import {
  getAnnouncement,
  safeContentHref,
  type AnnouncementTone,
} from "@/lib/cms";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<AnnouncementTone, string> = {
  info: "border-info/20 bg-info-soft text-info",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
};

/**
 * Site-wide system announcement (admin-managed, Phase 7). Renders nothing
 * unless an admin has enabled it and provided a message.
 */
export async function AnnouncementBanner() {
  const announcement = await getAnnouncement();
  if (!announcement.enabled || !announcement.message.trim()) return null;

  const href = safeContentHref(announcement.href, "");

  return (
    <div
      role="status"
      className={cn("border-b text-sm", TONE_CLASSES[announcement.tone])}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2.5 text-center sm:px-6 lg:px-8">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="font-medium">{announcement.message}</p>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
          >
            {announcement.linkLabel?.trim() || "Learn more"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
