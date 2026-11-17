import { Badge, type BadgeProps } from "@/components/ui/badge";

/** Support ticket lifecycle badge (open|in_progress|waiting_user|resolved|closed). */
const TICKET_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_user: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

const TICKET_STATUS_TONE: Record<string, BadgeProps["variant"]> = {
  open: "info",
  in_progress: "warning",
  waiting_user: "warning",
  resolved: "success",
  closed: "secondary",
};

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TICKET_STATUS_TONE[status] ?? "secondary"}>
      {TICKET_STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

/** Support ticket priority badge (low|medium|high|urgent). */
const PRIORITY_LABEL: Record<string, string> = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
  urgent: "Urgent",
};

const PRIORITY_TONE: Record<string, BadgeProps["variant"]> = {
  low: "secondary",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export function TicketPriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={PRIORITY_TONE[priority] ?? "secondary"}>
      {PRIORITY_LABEL[priority] ?? priority}
    </Badge>
  );
}

/** Dispute lifecycle badge (open|in_review|resolved|rejected). */
const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  rejected: "Rejected",
};

const DISPUTE_STATUS_TONE: Record<string, BadgeProps["variant"]> = {
  open: "info",
  in_review: "warning",
  resolved: "success",
  rejected: "danger",
};

export function DisputeStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={DISPUTE_STATUS_TONE[status] ?? "secondary"}>
      {DISPUTE_STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
