import Link from "next/link";
import { ArrowRight, IndianRupee, Users, Clock } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Demo campaign data for the marketplace preview.
 * In production, this will be fetched from the database.
 * Labeled as demo data per requirements.
 */
const demoCampaigns = [
  {
    id: "demo-1",
    brand: "TechBrand India",
    title: "Launch your tech review reels",
    category: "Technology",
    platform: "Instagram Reels",
    rewardPer1k: 120,
    maxReward: 15000,
    remainingBudget: 45000,
    deadline: "15 Dec 2026",
    minViews: 1000,
    status: "active",
  },
  {
    id: "demo-2",
    brand: "FitLife Apparel",
    title: "Fitness transformation clips",
    category: "Fitness",
    platform: "YouTube Shorts",
    rewardPer1k: 90,
    maxReward: 10000,
    remainingBudget: 28000,
    deadline: "20 Dec 2026",
    minViews: 500,
    status: "active",
  },
  {
    id: "demo-3",
    brand: "BrewMaster Coffee",
    title: "Coffee lover UGC campaign",
    category: "Food & Beverage",
    platform: "Instagram Reels",
    rewardPer1k: 75,
    maxReward: 8000,
    remainingBudget: 15000,
    deadline: "10 Dec 2026",
    minViews: 1000,
    status: "active",
  },
  {
    id: "demo-4",
    brand: "TravelGo",
    title: "Travel vlog clip campaign",
    category: "Travel",
    platform: "YouTube Shorts",
    rewardPer1k: 150,
    maxReward: 20000,
    remainingBudget: 60000,
    deadline: "31 Dec 2026",
    minViews: 2000,
    status: "active",
  },
];

export default function CampaignsPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Campaign Marketplace
            </h1>
            <p className="mt-2 text-ink-600">
              Browse active campaigns from brands across India.
            </p>
          </div>
          <Badge variant="warning">
            Demo data — sign up to see live campaigns
          </Badge>
        </div>

        {/* Filters (demo) */}
        <div className="mt-8 flex flex-wrap gap-2">
          {["All", "Technology", "Fitness", "Food", "Travel", "Fashion", "Gaming"].map(
            (cat) => (
              <button
                key={cat}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  cat === "All"
                    ? "bg-ink-900 text-white"
                    : "bg-surface text-ink-600 hover:bg-surface-muted border border-border"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {demoCampaigns.map((c) => (
            <Card key={c.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-lg font-bold text-ink-700">
                      {c.brand[0]}
                    </div>
                    <div>
                      <p className="text-sm text-ink-500">{c.brand}</p>
                      <p className="font-semibold text-ink-900">{c.title}</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="outline">{c.category}</Badge>
                  <Badge variant="outline">{c.platform}</Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-ink-500">Reward / 1K views</p>
                    <p className="tnum font-semibold text-ink-900">
                      <IndianRupee className="inline h-3.5 w-3.5" />
                      {c.rewardPer1k}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500">Max reward</p>
                    <p className="tnum font-semibold text-ink-900">
                      <IndianRupee className="inline h-3.5 w-3.5" />
                      {c.maxReward.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500">Remaining budget</p>
                    <p className="tnum font-semibold text-brand-700">
                      <IndianRupee className="inline h-3.5 w-3.5" />
                      {c.remainingBudget.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Deadline
                    </p>
                    <p className="font-semibold text-ink-900">{c.deadline}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs text-ink-500">
                  <Users className="h-3.5 w-3.5" />
                  Min. {c.minViews.toLocaleString("en-IN")} views to earn
                </div>

                <Button asChild className="mt-5 w-full">
                  <Link href={`/campaigns/${c.id}`}>
                    View campaign
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/signup">
              Sign up to join campaigns
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
