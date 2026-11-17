import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Compact metric tile used across the admin console. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-500">{label}</span>
          <Icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-ink-900">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
