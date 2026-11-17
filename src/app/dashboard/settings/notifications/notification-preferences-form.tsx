"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  updateNotificationPreferences,
  type NotificationPreferencesState,
} from "../actions";

export interface NotificationPreferences {
  email: boolean;
  in_app: boolean;
  marketing: boolean;
}

function ToggleRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      htmlFor={name}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border-soft bg-surface p-4"
    >
      <span className="min-w-0">
        <span className="block font-medium text-ink-900">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-500">{description}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          id={name}
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full bg-surface-muted ring-1 ring-inset ring-border transition-colors peer-checked:bg-mint-600 peer-focus-visible:ring-2 peer-focus-visible:ring-mint-500"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}

export function NotificationPreferencesForm({
  defaults,
}: {
  defaults: NotificationPreferences;
}) {
  const [state, action, pending] = useActionState<
    NotificationPreferencesState,
    FormData
  >(
    async (prevState, formData) => {
      const next = await updateNotificationPreferences(prevState, formData);
      if (next.status === "success") toast.success(next.message);
      if (next.status === "error") toast.error(next.message);
      return next;
    },
    { status: "idle" }
  );

  return (
    <form action={action} className="space-y-4">
      <ToggleRow
        name="email"
        label="Email notifications"
        description="Important account and campaign updates sent to your inbox."
        defaultChecked={defaults.email}
      />
      <ToggleRow
        name="in_app"
        label="In-app notifications"
        description="Show updates in your ClipSetu notifications feed."
        defaultChecked={defaults.in_app}
      />
      <ToggleRow
        name="marketing"
        label="Marketing emails"
        description="Occasional product news and offers. Off by default."
        defaultChecked={defaults.marketing}
      />

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className="text-sm text-ink-500"
          role="status"
        >
          {state.status === "success" || state.status === "error"
            ? state.message
            : ""}
        </p>
        <Button type="submit" disabled={pending} className="sm:w-auto">
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
