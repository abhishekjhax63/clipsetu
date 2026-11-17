"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { joinCampaign } from "@/app/dashboard/discover/actions";
import { Button } from "@/components/ui/button";

export function JoinCampaignButton({
  campaignId,
  label = "Join campaign",
  size = "default",
  variant = "default",
  className,
}: {
  campaignId: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      const result = await joinCampaign(campaignId);
      if (result.ok) {
        toast.success(result.message ?? "Joined campaign");
        router.push(`/dashboard/workspace/${campaignId}`);
      } else {
        toast.error(result.error ?? "Could not join this campaign");
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={handleJoin}
      disabled={pending}
      size={size}
      variant={variant}
      className={className}
    >
      <Handshake className="h-4 w-4" aria-hidden="true" />
      {pending ? "Joining…" : label}
    </Button>
  );
}
