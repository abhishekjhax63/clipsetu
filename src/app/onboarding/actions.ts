"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type OnboardingState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

const SETUP_MESSAGE =
  "Supabase is not configured. Copy .env.local.example to .env.local, add your project credentials and run the migrations in supabase/migrations. See INTEGRATION_SETUP.md.";

/** Ensure a user-entered website has a scheme so zod's url() validates it. */
function normalizeUrl(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** True only when the given ISO date is a valid date at least 18 years ago. */
function isAdultDate(iso: string): boolean {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

const brandSchema = z.object({
  brandName: z.string().trim().min(2, "Brand name is required").max(120),
  contactPerson: z.string().trim().min(2, "Contact person is required").max(120),
  officialEmail: z.string().trim().email("Enter a valid official email"),
  companyWebsite: z
    .union([z.literal(""), z.string().url("Enter a valid website URL")])
    .optional(),
  businessCategory: z.string().trim().min(2, "Select a business category"),
  country: z.string().trim().min(2, "Country is required"),
  gstin: z.string().trim().max(20).optional(),
  description: z.string().trim().max(2000).optional(),
});

const clipperSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, underscore or dot only"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
  country: z.string().trim().min(2, "Country is required"),
  dateOfBirth: z
    .string()
    .refine(isAdultDate, "You must be at least 18 years old to take part in paid campaigns"),
  bio: z.string().trim().max(500).optional(),
});

export async function completeBrandOnboarding(
  _state: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireAuth();

  if (user.role !== "brand") {
    return { message: "Only brand accounts can submit brand onboarding." };
  }

  const parsed = brandSchema.safeParse({
    brandName: formData.get("brandName"),
    contactPerson: formData.get("contactPerson"),
    officialEmail: formData.get("officialEmail"),
    companyWebsite: normalizeUrl(formData.get("companyWebsite")),
    businessCategory: formData.get("businessCategory"),
    country: formData.get("country"),
    gstin: formData.get("gstin") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!isSupabaseConfigured()) {
    return { message: SETUP_MESSAGE };
  }

  const supabase = await createClient();
  const { brandName, contactPerson, officialEmail, companyWebsite, businessCategory, country, gstin, description } =
    parsed.data;

  const { error } = await supabase.from("brand_profiles").upsert(
    {
      user_id: user.id,
      brand_name: brandName,
      contact_person: contactPerson,
      official_email: officialEmail,
      company_website: companyWebsite || null,
      business_category: businessCategory,
      country,
      gstin: gstin || null,
      description: description || null,
      verification_status: "pending",
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function completeCreatorOnboarding(
  _state: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireAuth();

  if (user.role !== "clipper") {
    return { message: "Only creator accounts can submit creator onboarding." };
  }

  const categories = formData
    .getAll("categories")
    .filter((c): c is string => typeof c === "string" && c.length > 0);

  const parsed = clipperSchema.safeParse({
    username: formData.get("username"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    dateOfBirth: formData.get("dateOfBirth"),
    bio: formData.get("bio") ?? "",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (categories.length === 0) {
    return { errors: { categories: ["Select at least one content category"] } };
  }

  if (!isSupabaseConfigured()) {
    return { message: SETUP_MESSAGE };
  }

  const supabase = await createClient();
  const { username, phone, country, dateOfBirth, bio } = parsed.data;

  const { error } = await supabase.from("creator_profiles").upsert(
    {
      user_id: user.id,
      username,
      display_name: user.fullName,
      bio: bio || null,
      country,
      categories,
      date_of_birth: dateOfBirth,
      kyc_status: "not_submitted",
    },
    { onConflict: "user_id" }
  );

  if (error) {
    // Surface a clean message for the common "username taken" case.
    if (error.code === "23505") {
      return { errors: { username: ["That username is already taken"] } };
    }
    return { message: error.message };
  }

  // Keep the profile phone in sync for contact purposes.
  await supabase.from("profiles").update({ phone, country }).eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
