"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { sendEmailOtp, verifyEmailOtp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmailOtpFormProps {
  /**
   * "signin" — email only (works for existing accounts).
   * "signup" — also collects name + role so a new account is provisioned
   *            correctly by the public.handle_new_user trigger.
   */
  variant?: "signin" | "signup";
}

/**
 * Passwordless email OTP: send a numeric one-time code, then verify it.
 * Both steps are Supabase server actions (signInWithOtp / verifyOtp).
 */
export function EmailOtpForm({ variant = "signin" }: EmailOtpFormProps) {
  const [sendState, sendAction, sending] = useActionState(sendEmailOtp, undefined);
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailOtp, undefined);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"clipper" | "brand">("clipper");

  // Once a code has been sent we move to the code step; the user can return to
  // the email step. Derived rather than stored so no setState-in-effect.
  const [emailAgain, setEmailAgain] = useState(false);
  const showCode = Boolean(sendState?.success) && !emailAgain;

  useEffect(() => {
    if (!sendState?.message) return;
    if (sendState.success) {
      toast.success(sendState.message);
    } else {
      toast.error(sendState.message);
    }
  }, [sendState]);

  useEffect(() => {
    if (verifyState?.message && !verifyState.success) {
      toast.error(verifyState.message);
    }
  }, [verifyState]);

  if (!showCode) {
    return (
      <form
        action={sendAction}
        onSubmit={() => setEmailAgain(false)}
        className="space-y-4"
      >
        {variant === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: "clipper", title: "I'm a Creator", hint: "Earn from clips" },
                  { id: "brand", title: "I'm a Brand", hint: "Launch campaigns" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={role === option.id}
                  onClick={() => setRole(option.id)}
                  className={cn(
                    "rounded-xl border p-3 text-center transition-colors",
                    role === option.id
                      ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600/20"
                      : "border-border hover:border-ink-300"
                  )}
                >
                  <p className="font-semibold text-ink-900">{option.title}</p>
                  <p className="text-xs text-ink-500">{option.hint}</p>
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role} />

            <div className="space-y-2">
              <Label htmlFor="otp-name">Full name</Label>
              <Input
                id="otp-name"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              {sendState?.errors?.fullName && (
                <p className="text-xs text-danger">{sendState.errors.fullName[0]}</p>
              )}
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="otp-email">Email</Label>
          <Input
            id="otp-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {sendState?.errors?.email && (
            <p className="text-xs text-danger">{sendState.errors.email[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Sending code..." : "Email me a code"}
        </Button>

        <p className="text-center text-xs text-ink-400">
          We&apos;ll email you a one-time code. No password needed.
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-surface-muted p-3">
        <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        <p className="text-xs text-ink-500">
          Enter the code sent to{" "}
          <span className="font-medium text-ink-900">{email}</span>.
        </p>
      </div>

      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />

        <div className="space-y-2">
          <Label htmlFor="otp-token">Verification code</Label>
          <Input
            id="otp-token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6,10}"
            maxLength={10}
            placeholder="Enter code"
            className="text-center text-lg tracking-[0.3em]"
            required
          />
          {verifyState?.errors?.token && (
            <p className="text-xs text-danger">{verifyState.errors.token[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={verifying}>
          {verifying ? "Verifying..." : "Verify and continue"}
        </Button>
      </form>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => setEmailAgain(true)}
          className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-3 w-3" />
          Use a different email
        </button>

        <form action={sendAction}>
          <input type="hidden" name="email" value={email} />
          {variant === "signup" && (
            <>
              <input type="hidden" name="fullName" value={fullName} />
              <input type="hidden" name="role" value={role} />
            </>
          )}
          <button
            type="submit"
            disabled={sending}
            className="font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            {sending ? "Sending..." : "Resend code"}
          </button>
        </form>
      </div>
    </div>
  );
}
