import { BadgeCheck, Signal, Wifi, BatteryFull, TrendingUp } from "lucide-react";

/**
 * Static product preview used in the hero. Mirrors the real dashboard layout so
 * visitors see the actual product surface. All figures are illustrative samples.
 */
const SAMPLE_CAMPAIGNS = [
  { brand: "NovaFit", title: "Monsoon workout reel", reward: 45, views: "128K" },
  { brand: "BrewHouse", title: "Cold brew launch", reward: 32, views: "74K" },
  { brand: "PayNest", title: "UPI savings explainer", reward: 60, views: "41K" },
];

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[336px]">
      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle_at_60%_35%,rgba(31,135,103,0.18),transparent_68%)]"
      />

      <div className="rounded-[2.5rem] border border-ink-800/60 bg-ink-950 p-2.5 shadow-xl">
        <div className="overflow-hidden rounded-[2rem] bg-surface">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[10px] font-semibold text-ink-500">
            <span className="tnum">9:41</span>
            <div className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryFull className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* App header */}
          <div className="flex items-center justify-between px-5 pb-4 pt-2">
            <div>
              <p className="text-[11px] text-ink-400">This month</p>
              <p className="tnum text-2xl font-bold tracking-tight text-ink-900">
                ₹42,860
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
              AR
            </span>
          </div>

          {/* Goal progress */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between text-[11px] text-ink-500">
              <span>Payout goal</span>
              <span className="tnum font-medium text-ink-700">86%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full w-[86%] rounded-full bg-brand-600" />
            </div>
          </div>

          {/* Live campaigns */}
          <div className="border-t border-border-soft px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Live campaigns
              </p>
              <span className="text-[11px] font-medium text-brand-700">
                View all
              </span>
            </div>
            <ul className="space-y-2.5">
              {SAMPLE_CAMPAIGNS.map((campaign) => (
                <li
                  key={campaign.title}
                  className="flex items-center gap-3 rounded-xl border border-border-soft p-2.5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-900 text-[11px] font-bold text-white">
                    {campaign.brand.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink-900">
                      {campaign.title}
                    </p>
                    <p className="text-[11px] text-ink-400">{campaign.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-xs font-bold text-ink-900">
                      ₹{campaign.reward}
                    </p>
                    <p className="tnum text-[10px] text-ink-400">/1K views</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Floating payout confirmation */}
      <div className="absolute -bottom-5 -left-4 flex items-center gap-3 rounded-2xl border border-border-soft bg-surface px-4 py-3 shadow-lg sm:-left-8">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] text-ink-400">Payout sent</p>
          <p className="tnum text-sm font-bold text-ink-900">₹12,400</p>
        </div>
      </div>

      {/* Floating trend chip */}
      <div className="absolute -right-3 top-16 hidden items-center gap-2 rounded-2xl border border-border-soft bg-surface px-3.5 py-2.5 shadow-lg sm:flex">
        <TrendingUp className="h-4 w-4 text-brand-600" />
        <span className="tnum text-xs font-semibold text-ink-900">+38%</span>
      </div>

      <p className="mt-9 text-center text-[11px] text-ink-400 sm:-ml-2 sm:text-left">
        Sample app preview — figures are illustrative.
      </p>
    </div>
  );
}
