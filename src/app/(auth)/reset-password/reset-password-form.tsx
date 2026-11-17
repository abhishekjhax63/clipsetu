"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useEffect } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { updatePassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-border-soft bg-surface p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <Lock className="h-6 w-6 text-brand-600" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink-900">Password updated</h1>
        <p className="mt-2 text-sm text-ink-500">
          Your password has been updated successfully. You can now log in with
          your new password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-ink-900">Set new password</h1>
      <p className="mt-1 text-sm text-ink-500">
        Choose a strong password for your account.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 chars, letters + numbers"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition-colors hover:text-ink-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {state?.errors?.password && (
            <p className="text-xs text-danger">{state.errors.password[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition-colors hover:text-ink-700"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {state?.errors?.confirmPassword && (
            <p className="text-xs text-danger">{state.errors.confirmPassword[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
