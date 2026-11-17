import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * GET /dashboard/campaigns/[id]/report
 *
 * Streams a CSV report of a campaign's submissions for the owning brand. Uses
 * the owner-scoped user client (RLS), so only the brand that owns the campaign
 * can export it — never the service role.
 */
interface MetricsRow {
  view_count: number;
  metrics_source: string;
  last_checked_at: string | null;
  created_at: string;
}

interface ProfileLite {
  full_name: string | null;
  email: string | null;
}

interface SubmissionRow {
  id: string;
  platform: string;
  post_url: string;
  status: string;
  submitted_at: string;
  profiles: ProfileLite[] | ProfileLite | null;
  submission_metrics: MetricsRow[] | null;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function firstProfile(
  rel: SubmissionRow["profiles"]
): ProfileLite | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  if (!isSupabaseConfigured()) {
    return new Response("Report service is not configured.", { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, brand_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign || campaign.brand_id !== user.id) {
    return new Response("Campaign not found.", { status: 404 });
  }

  const { data, error } = await supabase
    .from("submissions")
    .select(
      "id, platform, post_url, status, submitted_at, profiles(full_name, email), submission_metrics(view_count, metrics_source, last_checked_at, created_at)"
    )
    .eq("campaign_id", campaignId)
    .order("submitted_at", { ascending: false })
    .order("created_at", {
      referencedTable: "submission_metrics",
      ascending: false,
    });

  if (error) {
    return new Response("Could not generate the campaign report.", {
      status: 500,
    });
  }

  const rows = (data ?? []) as unknown as SubmissionRow[];

  const header = [
    "submission_id",
    "platform",
    "status",
    "post_url",
    "creator_name",
    "creator_email",
    "verified_views",
    "metrics_source",
    "metrics_checked_at",
    "submitted_at",
  ];

  const lines = [
    header,
    ...rows.map((s) => {
      const creator = firstProfile(s.profiles);
      const latest = s.submission_metrics?.[0] ?? null;
      return [
        s.id,
        s.platform,
        s.status,
        s.post_url,
        creator?.full_name ?? "",
        creator?.email ?? "",
        latest ? latest.view_count : "",
        latest ? latest.metrics_source : "",
        latest?.last_checked_at ?? "",
        s.submitted_at,
      ];
    }),
  ];

  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clipsetu-campaign-${campaignId}-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
