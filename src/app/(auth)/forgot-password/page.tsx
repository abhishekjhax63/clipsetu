"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useEffect } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { resetPassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  // Show a success state instead of the form once the email is sent
  if (state?.success) {
    return (
      <div className="rounded-2xl border border-border-soft bg-surface p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint-100">
          <Mail className="h-6 w-6 text-mint-600" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink-900">Check your email</h1>
        <p className="mt-2 text-sm text-ink-500">
          We&apos;ve sent a password reset link to your email address. The link
          will expire in 1 hour.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-mint-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink-900">Forgot password?</h1>
      <p className="mt-1 text-sm text-ink-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
          {state?.errors?.email && (
            <p className="text-xs text-danger">{state.errors.email[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-mint-600 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
