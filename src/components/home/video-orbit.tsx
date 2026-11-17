"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  type MotionValue,
} from "framer-motion";
import { Scissors } from "lucide-react";
import { OrbitVideoCard, type OrbitVideo } from "./orbit-video-card";
import { useMediaQuery, usePrefersReducedMotion } from "./hooks";

/**
 * Sample orbit cards — every card carries a visible "Sample" tag. These are
 * illustrative figures only and are never presented as live ClipSetu stats.
 */
const ORBIT_VIDEOS: OrbitVideo[] = [
  {
    id: "v1",
    platform: "instagram",
    views: 125_000,
    earnings: 2500,
    status: "Paid",
    poster: "bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600",
  },
  {
    id: "v2",
    platform: "youtube",
    views: 86_000,
    earnings: 1720,
    status: "Verified",
    poster: "bg-gradient-to-br from-red-400 via-orange-500 to-amber-500",
  },
  {
    id: "v3",
    platform: "instagram",
    views: 210_000,
    earnings: 4200,
    status: "Paid",
    poster: "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600",
  },
  {
    id: "v4",
    platform: "youtube",
    views: 64_000,
    earnings: 1280,
    status: "Verified",
    poster: "bg-gradient-to-br from-indigo-400 via-blue-500 to-sky-600",
  },
  {
    id: "v5",
    platform: "instagram",
    views: 340_000,
    earnings: 6800,
    status: "Paid",
    poster: "bg-gradient-to-br from-lime-400 via-green-500 to-emerald-600",
  },
];

const COUNT = ORBIT_VIDEOS.length;
const ORBIT_DURATION = 70; // seconds per revolution — slow & calm
const ORBIT_RADIUS = 32; // percent of the container half-width
const CARD_START = -90; // first card starts at the top

function CentralElement() {
  // Scoped id so the two rendered instances (desktop + mobile) never clash.
  const gradId = `ringGrad-${React.useId().replace(/:/g, "")}`;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Radial mint/lime lighting */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(134,239,172,0.5),rgba(163,230,53,0.14)_48%,transparent_72%)]" />

      {/* Rotating dashed ring */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        aria-hidden
      >
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="1.5"
          strokeDasharray="6 10"
          opacity="0.7"
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Brand disc */}
      <div className="relative flex h-[73%] w-[73%] flex-col items-center justify-center rounded-full bg-ink-900 shadow-2xl shadow-mint-500/20">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(74,222,128,0.35),transparent_55%)]" />
        <div className="relative flex items-center gap-1.5">
          <Scissors className="h-5 w-5 text-mint-400" />
          <span className="text-lg font-black tracking-tight text-white sm:text-xl">
            Clip<span className="text-mint-400">Setu</span>
          </span>
        </div>
        <div className="relative mt-2 flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-mint-200/80">
          <span className="h-1 w-1 rounded-full bg-mint-400" />
          Creator Marketplace
        </div>
      </div>
    </div>
  );
}

function OrbitingCard({
  video,
  angle,
  offset,
  onEnter,
  onLeave,
}: {
  video: OrbitVideo;
  angle: MotionValue<number>;
  offset: number;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const rad = (a: number) => ((a + offset) * Math.PI) / 180;

  const left = useTransform(
    angle,
    (a) => `${50 + Math.cos(rad(a)) * ORBIT_RADIUS}%`
  );
  const top = useTransform(
    angle,
    (a) => `${50 + Math.sin(rad(a)) * ORBIT_RADIUS}%`
  );
  // −1 = behind the centre (far side), +1 = in front (near side)
  const depth = useTransform(angle, (a) => Math.sin(rad(a)));

  const scale = useTransform(depth, [-1, 1], [0.86, 1.06]);
  const zIndex = useTransform(depth, [-1, 1], [6, 24]);
  const opacity = useTransform(depth, [-1, 1], [0.75, 1]);

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left, top, zIndex, opacity }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <motion.div style={{ scale }} className="w-[116px] lg:w-[120px]">
        <OrbitVideoCard video={video} />
      </motion.div>
    </motion.div>
  );
}

function DesktopOrbit() {
  const reduced = usePrefersReducedMotion();
  // The composition is only *visible* from `md` up (see VideoOrbit), so the
  // orbit loop must not run while it is hidden on small screens.
  const active = useMediaQuery("(min-width: 768px)");
  const angle = useMotionValue(CARD_START);
  const controlsRef = React.useRef<{
    pause: () => void;
    play: () => void;
    stop: () => void;
  } | null>(null);

  // Cursor-responsive parallax
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 120, damping: 20 });
  const spy = useSpring(py, { stiffness: 120, damping: 20 });

  React.useEffect(() => {
    if (reduced || !active) return;
    const controls = animate(angle, CARD_START + 360, {
      duration: ORBIT_DURATION,
      repeat: Infinity,
      ease: "linear",
    });
    controlsRef.current = controls;
    return () => {
      controls.stop();
      controlsRef.current = null;
    };
  }, [angle, reduced, active]);

  const onMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    px.set(relX * 22);
    py.set(relY * 22);
  };

  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  const pause = () => controlsRef.current?.pause();
  const resume = () => controlsRef.current?.play();

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[820px]"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div className="absolute inset-0" style={{ x: spx, y: spy }}>
        {/* Central brand element — sits between far and near cards */}
        <div className="absolute left-1/2 top-1/2 z-[14] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2">
          <CentralElement />
        </div>

        {/* Orbiting cards */}
        {ORBIT_VIDEOS.map((video, i) => (
          <OrbitingCard
            key={video.id}
            video={video}
            angle={angle}
            offset={(360 / COUNT) * i}
            onEnter={pause}
            onLeave={resume}
          />
        ))}
      </motion.div>
    </div>
  );
}

function MobileCarousel() {
  return (
    <div className="w-full">
      <div className="mx-auto mb-6 h-40 w-40">
        <CentralElement />
      </div>
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPadding: "0 1.5rem" }}
      >
        {ORBIT_VIDEOS.map((video) => (
          <div key={video.id} className="w-[184px] shrink-0 snap-center px-1">
            <OrbitVideoCard video={video} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-ink-400">
        Swipe to explore →
      </p>
    </div>
  );
}

/**
 * Picks the composition with CSS (not a JS media query) so the correct layout
 * is painted from the very first frame — no post-hydration layout shift. The
 * hidden branch stays inert: the orbit loop only starts on `md`+.
 */
export function VideoOrbit() {
  return (
    <>
      <div className="md:hidden">
        <MobileCarousel />
      </div>
      <div className="hidden md:block">
        <DesktopOrbit />
      </div>
    </>
  );
}
