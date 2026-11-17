"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const footerLinks = {
  Platform: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Campaigns", href: "/campaigns" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQ", href: "/faq" },
  ],
  ForCreators: [
    { label: "For Clippers", href: "/for-clippers" },
    { label: "Creator Guidelines", href: "/guidelines/creator" },
    { label: "Help Centre", href: "/help" },
  ],
  ForBrands: [
    { label: "For Brands", href: "/for-brands" },
    { label: "Brand Guidelines", href: "/guidelines/brand" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Cookies", href: "/cookies" },
    { label: "Payments & Refunds", href: "/payments" },
  ],
};

const noopSubscribe = () => () => {};

/**
 * Current year read only on the client. Server snapshot is fixed so prerendering
 * never touches the clock.
 */
function useCurrentYear() {
  return useSyncExternalStore(
    noopSubscribe,
    () => new Date().getFullYear(),
    () => 2026
  );
}

export function InteractiveFooter() {
  const year = useCurrentYear();

  return (
    <footer className="relative overflow-hidden bg-ink-900 text-white">
      {/* Brand band */}
      <div className="border-b border-white/10 px-4 py-16 sm:py-20">
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src="/brand/clipsetu-mark.png"
            alt="ClipSetu"
            width={80}
            height={80}
            className="h-16 w-16 object-contain sm:h-20 sm:w-20"
          />
          <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Clip<span className="text-mint-400">Setu</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm text-ink-400 sm:text-base">
            Create. Clip. Publish. Earn. — India&apos;s creator-powered clipping
            marketplace.
          </p>
        </motion.div>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <Image
                src="/brand/clipsetu-mark.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="text-xl font-bold tracking-tight">
                Clip<span className="text-mint-400">Setu</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-ink-400">
              India&apos;s creator-powered clipping marketplace. Create. Clip.
              Publish. Earn.
            </p>
            <div className="mt-5 flex gap-3">
              {["Instagram", "YouTube", "X", "LinkedIn"].map((s) => (
                <span
                  key={s}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xs text-ink-300 transition-colors hover:border-mint-400/50 hover:text-mint-400"
                >
                  {s[0]}
                </span>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-white">{group}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-sm text-ink-400 transition-colors hover:text-white"
                    >
                      <span className="relative">
                        {link.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-mint-400 transition-all duration-300 group-hover:w-full" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-ink-400">
            © {year} ClipSetu. All rights reserved.
          </p>
          <p className="text-xs text-ink-400">Made in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}
