"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { completeCreatorOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ClipperOnboardingForm({ defaultName = "" }: { defaultName?: string }) {
  const [state, action, pending] = useActionState(
    completeCreatorOnboarding,
    undefined
  );
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  function toggle(category: string) {
    setSelected((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            required
            placeholder="yourhandle"
            autoComplete="username"
          />
          <p className="text-xs text-ink-400">
            Your public creator handle on ClipSetu.
          </p>
          {state?.errors?.username && (
            <p className="text-xs text-danger">{state.errors.username[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" value={defaultName} disabled readOnly />
          <p className="text-xs text-ink-400">Change this later in settings.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            placeholder="+91 90000 00000"
            autoComplete="tel"
          />
          {state?.errors?.phone && (
            <p className="text-xs text-danger">{state.errors.phone[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            required
            defaultValue="India"
            placeholder="India"
          />
          {state?.errors?.country && (
            <p className="text-xs text-danger">{state.errors.country[0]}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          <p className="text-xs text-ink-400">
            You must be 18 or older to participate in paid campaigns and
            withdrawals.
          </p>
          {state?.errors?.dateOfBirth && (
            <p className="text-xs text-danger">{state.errors.dateOfBirth[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Preferred content categories</Label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_CATEGORIES.map((category) => {
            const active = selected.includes(category);
            return (
              <button
                type="button"
                key={category}
                onClick={() => toggle(category)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-ink-600 hover:bg-surface-muted"
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
        {selected.map((c) => (
          <input key={c} type="hidden" name="categories" value={c} />
        ))}
        {state?.errors?.categories && (
          <p className="text-xs text-danger">{state.errors.categories[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Short bio (optional)</Label>
        <Textarea
          id="bio"
          name="bio"
          maxLength={500}
          placeholder="Tell brands about your content style and audience."
        />
        {state?.errors?.bio && (
          <p className="text-xs text-danger">{state.errors.bio[0]}</p>
        )}
      </div>

      <p className="rounded-xl border border-border-soft bg-surface-soft p-4 text-xs leading-relaxed text-ink-500">
        Linking your Instagram and YouTube accounts happens through a secure
        OAuth flow when social verification is enabled. You can join and submit
        to campaigns now; verified views are always measured through official
        platform APIs.
      </p>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Complete profile"}
      </Button>
    </form>
  );
}
