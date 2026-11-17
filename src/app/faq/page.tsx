import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    q: "How do I earn money on ClipSetu?",
    a: "Join campaigns from brands, create clips from their source materials, publish on Instagram Reels or YouTube Shorts, and submit the post URL. You earn based on verified views: (eligible views ÷ 1,000) × campaign reward rate.",
  },
  {
    q: "How are views verified?",
    a: "We use official platform APIs (Instagram Graph API, YouTube Data API) to retrieve view counts. We never scrape private data or use fake numbers. Every view is backed by official data.",
  },
  {
    q: "What is the minimum withdrawal amount?",
    a: "The minimum withdrawal is ₹100 for free accounts and ₹50 for Pro accounts. Withdrawals are processed to your bank account.",
  },
  {
    q: "Do I need a minimum follower count?",
    a: "Most campaigns have no minimum follower requirement. Some premium campaigns may specify eligibility criteria, which are clearly listed on each campaign page.",
  },
  {
    q: "How do brands pay for campaigns?",
    a: "Brands fund their campaign wallet using Razorpay or Cashfree. Funds are held securely and released to creators as verified views come in.",
  },
  {
    q: "Can brands reject my submission?",
    a: "Yes, brands review every submission. If rejected, you'll see the reason and can submit revisions. Only approved submissions earn rewards.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. We use Supabase with Row Level Security, encrypted token storage, and never store social account passwords. All financial transactions use a double-entry ledger.",
  },
  {
    q: "How long does it take to get paid?",
    a: "Once views are verified (typically within 24-48 hours), rewards are credited to your wallet. Withdrawals are processed within 3-5 business days after approval.",
  },
];

export default function FAQPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <Badge variant="success" className="mb-6">FAQ</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
          Everything you need to know about ClipSetu.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-border-soft bg-surface p-5 shadow-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-semibold text-ink-900">{faq.q}</span>
                <span className="text-ink-400 transition-transform group-open:rotate-45 text-xl">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-ink-600 leading-relaxed">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-ink-900 p-8 text-center">
          <h2 className="text-xl font-bold text-white">Still have questions?</h2>
          <p className="mt-2 text-ink-300">
            Our support team is here to help.
          </p>
          <Button asChild variant="outline" size="lg" className="mt-5 border-white/20 text-white hover:bg-white/10">
            <Link href="/contact">
              Contact support
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
