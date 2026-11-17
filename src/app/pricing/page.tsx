import Link from "next/link";
import { ArrowRight, Check, IndianRupee } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: 0,
    period: "free",
    description: "For creators just getting started",
    features: [
      "Browse all campaigns",
      "Submit up to 5 clips/month",
      "Basic analytics",
      "Standard withdrawal threshold: ₹100",
      "Email support",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Creator Pro",
    price: 499,
    period: "month",
    description: "For active creators",
    features: [
      "Unlimited clip submissions",
      "Priority campaign access",
      "Advanced analytics",
      "Lower withdrawal threshold: ₹50",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Brand",
    price: "Custom",
    period: "campaign",
    description: "For brands & marketers",
    features: [
      "Unlimited campaigns",
      "Full submission review control",
      "Real-time analytics dashboard",
      "Fraud detection & protection",
      "Dedicated account manager",
      "API access",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
      <Badge variant="success" className="mb-6">Pricing</Badge>
      <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
        Simple, transparent pricing
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
        Start free. Upgrade when you&apos;re ready. No hidden fees, ever.
      </p>
    </section>

    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.highlight
                  ? "border-2 border-mint-500 shadow-lg scale-[1.02]"
                  : ""
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-mint-600 text-white">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <h3 className="text-xl font-bold text-ink-900">{plan.name}</h3>
                <p className="text-sm text-ink-500">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  {typeof plan.price === "number" ? (
                    <>
                      {plan.price > 0 && (
                        <IndianRupee className="h-5 w-5 text-ink-900" />
                      )}
                      <span className="text-4xl font-bold text-ink-900">
                        {plan.price === 0 ? "Free" : plan.price}
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-ink-900">
                      {plan.price}
                    </span>
                  )}
                  {plan.period !== "free" && plan.price !== "Custom" && (
                    <span className="text-sm text-ink-500">/{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-mint-600 shrink-0 mt-0.5" />
                      <span className="text-ink-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-6 w-full ${
                    plan.highlight
                      ? "bg-mint-600 text-white hover:bg-mint-700"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link href="/signup">
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-ink-500">
            Platform fee: 10% on all creator earnings. No platform fee on brand deposits.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
