import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { isAdmin, requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandOnboardingForm } from "./brand-form";
import { ClipperOnboardingForm } from "./clipper-form";

export const metadata: Metadata = {
  title: "Complete your profile",
  description: "Finish setting up your ClipSetu account.",
  robots: { index: false, follow: false },
};

async function OnboardingRouter() {
  const user = await requireAuth();

  if (isAdmin(user.role)) {
    redirect("/admin");
  }

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice title="Onboarding needs a backend">
        Your account exists, but profiles can&apos;t be saved until Supabase is
        configured and the migrations in{" "}
        <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
          supabase/migrations
        </code>{" "}
        have been applied.
      </SetupNotice>
    );
  }

  const supabase = await createClient();

  if (user.role === "brand") {
    const { data } = await supabase
      .from("brand_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) redirect("/dashboard");

    return (
      <BrandOnboardingForm
        defaultContactName={user.fullName ?? ""}
        defaultEmail={user.email}
      />
    );
  }

  const { data } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) redirect("/dashboard");

  return <ClipperOnboardingForm defaultName={user.fullName ?? ""} />;
}

function OnboardingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <>
      <div className="mb-8">
        <BadgeCheck className="h-8 w-8 text-mint-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          This information is shown to the other side of the marketplace and is
          required before you can start.
        </p>
      </div>
      <div className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm sm:p-8">
        <Suspense fallback={<OnboardingSkeleton />}>
          <OnboardingRouter />
        </Suspense>
      </div>
    </>
  );
}
