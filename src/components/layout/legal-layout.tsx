import Link from "next/link";
import { TriangleExclamationPoint } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";

/**
 * Shared layout for legal & policy documents (terms, privacy, cookies,
 * payments, guidelines). Keeps content in the page files as plain JSX while
 * providing a consistent header, DRAFT notice and prose column.
 */
export function LegalLayout({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <header className="animate-fade-in-up">
          <Badge variant="secondary" className="mb-6">
            Legal
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-ink-500">Last updated {lastUpdated}</p>
          {intro && (
            <p className="mt-6 text-lg leading-relaxed text-ink-600">{intro}</p>
          )}
        </header>

        <div className="mt-10 rounded-2xl border border-warning/30 bg-warning-soft/50 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <TriangleExclamationPoint
              className="h-4 w-4 text-warning"
              aria-hidden="true"
            />
            <Badge variant="warning">DRAFT — PENDING LEGAL REVIEW</Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            This document is a working template provided for transparency. It has
            not yet been reviewed by qualified legal counsel. It does not
            constitute legal advice, and the wording, disclosures and obligations
            below may change before production launch. Do not rely on it as a
            final statement of rights or duties.
          </p>
        </div>

        <div className="mt-12 space-y-8">{children}</div>

        <div className="mt-12 rounded-2xl border border-border-soft bg-surface-soft p-5 text-sm text-ink-500">
          Questions about this document?{" "}
          <Link
            href="/contact"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            Contact us
          </Link>{" "}
          and our team will get back to you.
        </div>
      </div>
    </PublicLayout>
  );
}

/**
 * A single titled section within a legal document. Pass paragraphs and lists
 * as children.
 */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-600">
        {children}
      </div>
    </section>
  );
}
