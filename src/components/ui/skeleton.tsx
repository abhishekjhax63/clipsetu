import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder. Uses the `.skeleton` shimmer defined in globals.css.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-lg", className)} {...props} />;
}

export { Skeleton };
