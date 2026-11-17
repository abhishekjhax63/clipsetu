"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IndianRupee, Play, BadgeCheck } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";

export interface OrbitVideo {
  id: string;
  platform: "instagram" | "youtube";
  views: number;
  earnings: number;
  status: "Verified" | "Paid";
  /** Tailwind gradient classes for the poster frame (sample, not a real asset). */
  poster: string;
  /** Optional click destination. Defaults to the campaigns index. */
  href?: string;
}

const PLATFORM_META: Record<
  OrbitVideo["platform"],
  { label: string; short: string; color: string }
> = {
  instagram: {
    label: "Instagram Reels",
    short: "IG",
    color: "text-pink-500",
  },
  youtube: {
    label: "YouTube Shorts",
    short: "YT",
    color: "text-red-500",
  },
};

/** K/M view formatting — matches how creators read platform metrics. */
function formatViews(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

interface OrbitVideoCardProps {
  video: OrbitVideo;
  className?: string;
  /** Reports hover state back to the orbit so it can pause. */
  onHoverChange?: (hovered: boolean) => void;
}

/**
 * A single video card used in the orbit and the mobile carousel.
 *
 * No real video assets are bundled, so each frame renders a styled poster with
 * an explicit "Sample" tag. The figures are illustrative and are never
 * presented as live ClipSetu statistics.
 */
export function OrbitVideoCard({
  video,
  className,
  onHoverChange,
}: OrbitVideoCardProps) {
  const meta = PLATFORM_META[video.platform];
  const rate = Math.round(video.earnings / (video.views / 1000));

  return (
    <Link
      href={video.href ?? "/campaigns"}
      data-cursor
      aria-label={`Sample clip — ${meta.label}, ${formatViews(
        video.views
      )} views, ${formatINR(video.earnings, {
        maximumFractionDigits: 0,
      })} earned`}
      className={cn(
        "group block w-full select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-2",
        className
      )}
    >
      <motion.div
        onHoverStart={() => onHoverChange?.(true)}
        onHoverEnd={() => onHoverChange?.(false)}
        whileHover={{ scale: 1.06, zIndex: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative w-full overflow-hidden rounded-2xl border border-white/60 bg-white/95 p-1.5 shadow-xl shadow-ink-900/10 backdrop-blur-md"
      >
        {/* Poster */}
        <div
          className={cn(
            "relative aspect-[9/16] overflow-hidden rounded-xl",
            video.poster
          )}
        >
          {/* Faux video lighting + vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.5))]" />

          {/* Platform indicator */}
          <div className="absolute left-1.5 top-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
            {meta.short}
          </div>

          {/* Sample tag */}
          <div className="absolute right-1.5 top-1.5 rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-ink-600">
            Sample
          </div>

          {/* Play affordance */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-300 group-hover:scale-110">
              <Play className="ml-0.5 h-3.5 w-3.5 fill-ink-900 text-ink-900" />
            </div>
          </div>

          {/* Hover-revealed performance detail */}
          <div className="absolute inset-x-1.5 bottom-1.5 translate-y-2 rounded-lg bg-black/55 px-2 py-1 text-[9px] font-semibold text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            ₹{rate}/1K verified · View post →
          </div>
        </div>

        {/* Meta */}
        <div className="px-1 pb-0.5 pt-1.5">
          <div className="flex items-center justify-between text-[10px] text-ink-500">
            <span className="flex items-center gap-1">
              <BadgeCheck className={cn("h-3 w-3", meta.color)} />
              {formatViews(video.views)} views
            </span>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold",
                video.status === "Paid"
                  ? "bg-mint-100 text-mint-700"
                  : "bg-info-soft text-info"
              )}
            >
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  video.status === "Paid" ? "bg-mint-500" : "bg-info"
                )}
              />
              {video.status}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold text-ink-900">
            <IndianRupee className="h-3 w-3" />
            {formatINR(video.earnings, { maximumFractionDigits: 0 })}
            <span className="text-[9px] font-medium text-ink-400">earned</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
