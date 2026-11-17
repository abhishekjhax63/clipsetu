import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  LifeBuoy,
  Lock,
  Rocket,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getHelpCategories, type HelpIconKey } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Browse ClipSetu help topics for creators and brands — getting started, payments, payouts, account security, verification and more.",
};

/** Icon assigned to each help category by its CMS `icon` key. */
const HELP_ICONS: Record<HelpIconKey, LucideIcon> = {
  rocket: Rocket,
  users: Users,
  "badge-check": BadgeCheck,
  wallet: Wallet,
  lock: Lock,
  "scroll-text": ScrollText,
};

export default async function HelpPage() {
  const categories = await getHelpCategories();

  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <Badge variant="success" className="mb-6">
          Help Centre
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          How can we help?
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
          Browse guides and answers for creators and brands. Most questions are
          covered by topic below.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/faq">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Browse the FAQ
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/guidelines/community">
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              Community Guidelines
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => {
            const CategoryIcon = HELP_ICONS[category.icon] ?? Rocket;
            return (
              <Card key={`${category.title}-${index}`} className="flex flex-col">
                <CardHeader>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                    <CategoryIcon
                      className="h-5 w-5 text-brand-700"
                      aria-hidden="true"
                    />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-ink-900">
                    {category.title}
                  </h2>
                  <p className="text-sm text-ink-500">{category.desc}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {category.articles.map((article) => (
                      <li key={article}>
                        <Link
                          href="/faq"
                          className="flex items-start gap-2 text-sm text-ink-700 transition-colors hover:text-ink-900"
                        >
                          <ArrowRight
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300"
                            aria-hidden="true"
                          />
                          <span>{article}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl bg-ink-900 p-8 text-center sm:p-12">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <LifeBuoy className="h-6 w-6 text-brand-400" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white">
            Still need help?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-ink-300">
            Can&apos;t find the answer you&apos;re looking for? Our support team
            is here to help.
          </p>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="mt-6 border-white/20 text-white hover:bg-white/10"
          >
            <Link href="/contact">
              Contact support
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
