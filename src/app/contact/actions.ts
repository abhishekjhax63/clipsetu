"use server";

import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ContactState =
  | {
      success?: boolean;
      errors?: Record<string, string[] | undefined>;
      message?: string;
    }
  | undefined;

const SETUP_MESSAGE =
  "Contact messages can't be saved yet because Supabase is not configured. Copy .env.local.example to .env.local, add your project credentials and run the migrations in supabase/migrations. See INTEGRATION_SETUP.md.";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  subject: z.string().trim().min(3, "Add a short subject").max(160),
  message: z
    .string()
    .trim()
    .min(10, "Please add a little more detail")
    .max(4000, "Message is too long"),
});

export async function submitContactMessage(
  _state: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: a hidden field real users never fill. Bots that fill it are
  // silently accepted so they don't retry, but nothing is stored.
  const honeypot = formData.get("company_url");
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return { success: true };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (!isSupabaseConfigured()) {
    return { message: SETUP_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status: "new",
  });

  if (error) {
    return {
      message:
        "We couldn't send your message right now. Please try again in a moment.",
    };
  }

  return {
    success: true,
    message:
      "Thanks — your message has been received. Our team typically replies within 2 business days.",
  };
}
