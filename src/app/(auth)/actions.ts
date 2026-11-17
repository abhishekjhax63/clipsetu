"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  rateLimitMessage,
} from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["brand", "clipper"]),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AuthState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
      success?: boolean;
    }
  | undefined;

export async function signup(state: AuthState, formData: FormData): Promise<AuthState> {
  const validated = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password, fullName, role } = validated.data;

  const ip = await getClientIp();
  const ipLimit = await checkRateLimit(RATE_LIMITS.signup, ip);
  if (!ipLimit.allowed) {
    return { message: rateLimitMessage(ipLimit) };
  }

  try {
    const supabase = await createClient();

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")) {
      return {
        message:
          "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See INTEGRATION_SETUP.md for details.",
      };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      return { message: error.message };
    }

    // The public.handle_new_user trigger provisions the profile, wallet and
    // role-specific row from the auth metadata above, so no manual insert is
    // needed here (and a manual one would collide on profiles.id).

    revalidatePath("/", "layout");
    return { success: true, message: "Check your email for verification" };
  } catch (err) {
    console.error("Signup error:", err);
    return { message: "An unexpected error occurred. Please try again." };
  }
}

export async function login(state: AuthState, formData: FormData): Promise<AuthState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validated.data;

  // Abuse protection: limit by client IP and by targeted account.
  const ip = await getClientIp();
  const ipLimit = await checkRateLimit(RATE_LIMITS.login, ip);
  if (!ipLimit.allowed) {
    return { message: rateLimitMessage(ipLimit) };
  }
  const emailLimit = await checkRateLimit(RATE_LIMITS.login, `email:${email}`);
  if (!emailLimit.allowed) {
    return { message: rateLimitMessage(emailLimit) };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")) {
    return {
      message:
        "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    };
  }

  // NOTE: keep redirect() OUTSIDE the try/catch. It throws a special
  // NEXT_REDIRECT error that a catch block would otherwise swallow.
  let signInError: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) signInError = error.message;
  } catch (err) {
    console.error("Login error:", err);
    return { message: "An unexpected error occurred. Please try again." };
  }

  if (signInError) {
    return { message: signInError };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPassword(state: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email") as string;
  const validated = z.string().email().safeParse(email);

  if (!validated.success) {
    return { message: "Please enter a valid email" };
  }

  const ip = await getClientIp();
  const ipLimit = await checkRateLimit(RATE_LIMITS.passwordReset, ip);
  if (!ipLimit.allowed) {
    return { message: rateLimitMessage(ipLimit) };
  }

  try {
    const supabase = await createClient();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")) {
      return {
        message:
          "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(validated.data, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) return { message: error.message };

    return { success: true, message: "Password reset email sent" };
  } catch (err) {
    console.error("Reset password error:", err);
    return { message: "An error occurred. Please try again." };
  }
}

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

/**
 * Update the user's password. Requires an active recovery session
 * (set by the /auth/reset-password route after exchanging the reset code).
 */
export async function updatePassword(state: AuthState, formData: FormData): Promise<AuthState> {
  const validated = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  try {
    const supabase = await createClient();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")) {
      return {
        message:
          "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: validated.data.password,
    });

    if (error) return { message: error.message };

    revalidatePath("/", "layout");
    return { success: true, message: "Password updated successfully" };
  } catch (err) {
    console.error("Update password error:", err);
    return { message: "An error occurred. Please try again." };
  }
}

/* -------------------------------------------------------------------------- */
/* Email OTP (passwordless) — Supabase signInWithOtp + verifyOtp              */
/* -------------------------------------------------------------------------- */

const NOT_CONFIGURED =
  "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.";

const emailOtpSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  // Optional: only sent from the signup flow so a brand-new account is created
  // with the right name/role. Ignored for existing users (role is never
  // re-derived from client input — public.handle_new_user validates it).
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  role: z.enum(["brand", "clipper"]).optional(),
});

const emailOtpVerifySchema = z.object({
  email: z.string().email("Please enter a valid email"),
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

/**
 * Send a one-time 6-digit code to `email`. Creates the account if it does not
 * exist yet (`shouldCreateUser`), so the same flow covers sign-in and sign-up.
 */
export async function sendEmailOtp(
  state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validated = emailOtpSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName") || undefined,
    role: formData.get("role") || undefined,
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, fullName, role } = validated.data;

  const ip = await getClientIp();
  const ipLimit = await checkRateLimit(RATE_LIMITS.emailOtp, ip);
  if (!ipLimit.allowed) return { message: rateLimitMessage(ipLimit) };

  const emailLimit = await checkRateLimit(RATE_LIMITS.emailOtp, `email:${email}`);
  if (!emailLimit.allowed) return { message: rateLimitMessage(emailLimit) };

  if (!isSupabaseConfigured()) return { message: NOT_CONFIGURED };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        ...(fullName || role
          ? { data: { ...(fullName ? { full_name: fullName } : {}), ...(role ? { role } : {}) } }
          : {}),
      },
    });

    if (error) return { message: error.message };

    return {
      success: true,
      message: `We emailed a 6-digit code to ${email}.`,
    };
  } catch (err) {
    console.error("Send email OTP error:", err);
    return { message: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Verify the 6-digit code and start a session.
 * NOTE: keep redirect() OUTSIDE the try/catch — it throws NEXT_REDIRECT.
 */
export async function verifyEmailOtp(
  state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validated = emailOtpVerifySchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, token } = validated.data;

  const ip = await getClientIp();
  const ipLimit = await checkRateLimit(RATE_LIMITS.emailOtpVerify, ip);
  if (!ipLimit.allowed) return { message: rateLimitMessage(ipLimit) };

  if (!isSupabaseConfigured()) return { message: NOT_CONFIGURED };

  let verifyError: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) verifyError = error.message;
  } catch (err) {
    console.error("Verify email OTP error:", err);
    return { message: "An unexpected error occurred. Please try again." };
  }

  if (verifyError) return { message: verifyError };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
