import Link from "next/link";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Explicit "not configured" state. Shown instead of pretending a backend
 * feature works. See INTEGRATION_SETUP.md.
 */
export function SetupNotice({
  title = "Backend not configured",
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-warning/30 bg-warning-soft/40">
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-warning" aria-hidden="true" />
          <Badge variant="warning">Setup required</Badge>
        </div>
        <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
        <div className="mt-2 text-sm leading-relaxed text-ink-600">
          {children ?? (
            <>
              This feature needs real Supabase credentials. Copy{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                .env.local.example
              </code>{" "}
              to{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                .env.local
              </code>
              , follow{" "}
              <Link
                href="/help"
                className="font-medium text-ink-900 underline-offset-4 hover:underline"
              >
                the setup guide
              </Link>{" "}
              and run the migrations in{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                supabase/migrations
              </code>
              . Nothing is faked while unconfigured.
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
