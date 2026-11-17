"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CircleCheckBig, Send } from "lucide-react";
import { submitContactMessage } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [state, action, pending] = useActionState(
    submitContactMessage,
    undefined
  );

  useEffect(() => {
    if (state?.message && !state?.success) toast.error(state.message);
  }, [state]);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-mint-200 bg-gradient-earn-soft px-6 py-12 text-center">
        <CircleCheckBig className="h-8 w-8 text-mint-600" aria-hidden="true" />
        <p className="mt-4 font-semibold text-ink-900">Message sent</p>
        <p className="mt-1 max-w-sm text-sm text-ink-600">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {/* Honeypot — hidden from humans, ignored by screen readers. */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="company_url">Company website</label>
        <input id="company_url" name="company_url" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required autoComplete="name" />
          {state?.errors?.name && (
            <p className="text-xs text-danger">{state.errors.name[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
          {state?.errors?.email && (
            <p className="text-xs text-danger">{state.errors.email[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required maxLength={160} />
        {state?.errors?.subject && (
          <p className="text-xs text-danger">{state.errors.subject[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">How can we help?</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={4000}
          placeholder="Tell us what's going on. If it's about a campaign or payment, include the campaign or submission reference."
        />
        {state?.errors?.message && (
          <p className="text-xs text-danger">{state.errors.message[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <p className="rounded-xl border border-warning/30 bg-warning-soft/40 p-3 text-xs text-ink-600">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? "Sending..." : "Send message"}
      </Button>
      <p className="text-center text-xs text-ink-400">
        We never ask for your password, OTP or API keys. Do not include them.
      </p>
    </form>
  );
}
