import { Badge } from "@/components/ui/badge";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUS_TONE,
} from "@/lib/campaigns";

/** Campaign lifecycle badge, using the shared status labels/tones. */
export function CampaignStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={CAMPAIGN_STATUS_TONE[status] ?? "secondary"}>
      {CAMPAIGN_STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

/** Submission lifecycle badge, using the shared status labels/tones. */
export function SubmissionStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={SUBMISSION_STATUS_TONE[status] ?? "secondary"}>
      {SUBMISSION_STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
