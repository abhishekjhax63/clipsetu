"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { signup } from "../actions";
import { EmailOtpForm } from "../email-otp-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"clipper" | "brand">("clipper");

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-ink-900">Create your account</h1>
      <p className="mt-1 text-sm text-ink-500">
        Join ClipSetu and start earning
      </p>

      <Tabs defaultValue="password" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="otp">Email code</TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <form action={action} className="space-y-4">
            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={role === "clipper"}
                onClick={() => setRole("clipper")}
                className={cn(
                  "rounded-xl border p-3 text-center transition-colors",
                  role === "clipper"
                    ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600/20"
                    : "border-border hover:border-ink-300"
                )}
              >
                <p className="font-semibold text-ink-900">I&apos;m a Creator</p>
                <p className="text-xs text-ink-500">Earn from clips</p>
              </button>
              <button
                type="button"
                aria-pressed={role === "brand"}
                onClick={() => setRole("brand")}
                className={cn(
                  "rounded-xl border p-3 text-center transition-colors",
                  role === "brand"
                    ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600/20"
                    : "border-border hover:border-ink-300"
                )}
              >
                <p className="font-semibold text-ink-900">I&apos;m a Brand</p>
                <p className="text-xs text-ink-500">Launch campaigns</p>
              </button>
            </div>
            <input type="hidden" name="role" value={role} />

            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                required
              />
              {state?.errors?.fullName && (
                <p className="text-xs text-danger">{state.errors.fullName[0]}</p>
              )}
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="otp">
          <EmailOtpForm variant="signup" />
        </TabsContent>
      </Tabs>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
