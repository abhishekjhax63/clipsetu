import { Badge, type BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

/**
 * Shared status → tone mapping for the admin console. Kept in one place so the
 * campaign, submission, withdrawal, ticket, dispute and verification views never
 * drift apart.
 */
const TONES: Record<string, Variant> = {
  // campaigns
  draft: "secondary",
  pending_payment: "warning",
  pending_review: "warning",
  scheduled: "info",
  active: "success",
  paused: "warning",
  completed: "secondary",
  rejected: "danger",
  cancelled: "danger",
  // submissions
  submitted: "info",
  processing: "info",
  approved: "success",
  revision_requested: "warning",
  metrics_unavailable: "warning",
  disputed: "danger",
  // withdrawals / payouts
  pending: "warning",
  failed: "danger",
  // support tickets
  open: "info",
  in_progress: "warning",
  waiting_user: "warning",
  resolved: "success",
  closed: "secondary",
  // disputes
  in_review: "warning",
  // verification / accounts
  not_submitted: "secondary",
  under_review: "warning",
  verified: "success",
  suspended: "danger",
  restricted: "warning",
  // generic
  new: "info",
  read: "secondary",
  replied: "success",
};

export function AdminStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge variant={TONES[status] ?? "secondary"} className={className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function AdminPriorityBadge({ priority }: { priority: string }) {
  const variant: Variant =
    priority === "urgent"
      ? "danger"
      : priority === "high"
        ? "warning"
        : priority === "low"
          ? "secondary"
          : "info";
  return <Badge variant={variant}>{priority}</Badge>;
}
