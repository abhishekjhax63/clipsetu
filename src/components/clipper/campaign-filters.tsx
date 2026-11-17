"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
];

const VIEW_THRESHOLDS = [
  { value: "", label: "Any view requirement" },
  { value: "500", label: "500 or fewer" },
  { value: "1000", label: "1,000 or fewer" },
  { value: "5000", label: "5,000 or fewer" },
  { value: "10000", label: "10,000 or fewer" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Any open status" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
];

const SELECT_CLASS =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:border-mint-500";

/**
 * Client filter bar. Writes filters into the URL searchParams so the server
 * component re-queries from scratch on every change (server-side filtering).
 */
export function CampaignFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const value = (key: string) => searchParams.get(key) ?? "";

  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  function setParam(key: string, next: string) {
    navigate((params) => {
      if (next) params.set(key, next);
      else params.delete(key);
    });
  }

  return (
    <form
      className="rounded-2xl border border-border-soft bg-surface p-4 shadow-sm sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setParam("q", String(data.get("q") ?? "").trim());
      }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filter campaigns
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-q">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <Input
              id="filter-q"
              name="q"
              defaultValue={value("q")}
              placeholder="Campaign title"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-category">Category</Label>
          <select
            id="filter-category"
            className={SELECT_CLASS}
            value={value("category")}
            onChange={(event) => setParam("category", event.target.value)}
          >
            <option value="">All categories</option>
            {BUSINESS_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-platform">Platform</Label>
          <select
            id="filter-platform"
            className={SELECT_CLASS}
            value={value("platform")}
            onChange={(event) => setParam("platform", event.target.value)}
          >
            <option value="">All platforms</option>
            {PLATFORM_OPTIONS.map((platform) => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-reward">Min. reward per 1K views (₹)</Label>
          <Input
            id="filter-reward"
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            defaultValue={value("minReward")}
            placeholder="e.g. 50"
            onBlur={(event) => setParam("minReward", event.target.value.trim())}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-views">View requirement</Label>
          <select
            id="filter-views"
            className={SELECT_CLASS}
            value={value("minViews")}
            onChange={(event) => setParam("minViews", event.target.value)}
          >
            {VIEW_THRESHOLDS.map((threshold) => (
              <option key={threshold.value} value={threshold.value}>
                {threshold.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-language">Content language</Label>
          <Input
            id="filter-language"
            defaultValue={value("language")}
            placeholder="e.g. Hindi"
            onBlur={(event) => setParam("language", event.target.value.trim())}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            className={SELECT_CLASS}
            value={value("status")}
            onChange={(event) => setParam("status", event.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Apply
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </Button>
        {pending ? (
          <span className="text-xs text-ink-400">Updating…</span>
        ) : null}
      </div>
    </form>
  );
}
