import type { Metadata } from "next";
import { Clock, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the ClipSetu team for brand campaigns, creator support, payments or partnerships.",
};

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@clipsetu.com";

const channels = [
  {
    icon: Mail,
    title: "Email us",
    body: SUPPORT_EMAIL,
    note: "Best for account, campaign and payment queries.",
  },
  {
    icon: Clock,
    title: "Response time",
    body: "Within 2 business days",
    note: "Payment and account issues are prioritised.",
  },
  {
    icon: ShieldCheck,
    title: "Safety first",
    body: "We never ask for passwords or OTPs",
    note: "Report suspicious activity to us immediately.",
  },
];

export default function ContactPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6 lg:px-8">
        <Badge variant="success" className="mb-6">
          Contact
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Get in touch
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
          Questions about launching a campaign, getting paid, or partnering with
          ClipSetu? Send us a message and the right team will get back to you.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {channels.map((c) => (
            <Card key={c.title}>
              <CardContent className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
                  <c.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-semibold text-ink-900">{c.title}</h2>
                <p className="mt-1 text-sm font-medium text-ink-700">{c.body}</p>
                <p className="mt-1 text-xs text-ink-400">{c.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border-soft bg-surface p-6 shadow-xs sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink-900">
              Send us a message
            </h2>
          </div>
          <ContactForm />
        </div>
      </section>
    </PublicLayout>
  );
}
