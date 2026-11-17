import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "./reset-password-form";

async function ResetPasswordGate() {
  // Verify a recovery session exists (set by the reset-link route).
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?error=reset_link_invalid");
  }

  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5 rounded-2xl border border-border-soft bg-surface p-8 shadow-sm">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      }
    >
      <ResetPasswordGate />
    </Suspense>
  );
}
