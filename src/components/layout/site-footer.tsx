"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Logo } from "./site-header";

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
 * Current year read only on the client. The server snapshot is a fixed value so
 * prerendering never touches the clock (which would block static generation).
 */
function useCurrentYear() {
  return useSyncExternalStore(
    noopSubscribe,
    () => new Date().getFullYear(),
    () => 2026
  );
}

export function SiteFooter() {
  const year = useCurrentYear();

  return (
    <footer className="border-t border-border-soft bg-surface-soft mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ink-500">
              India&apos;s creator-powered clipping marketplace. Create. Clip.
              Publish. Earn.
            </p>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-ink-900">{group}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border-soft pt-6 sm:flex-row">
          <p className="text-xs text-ink-400">
            © {year} ClipSetu. All rights reserved.
          </p>
          <p className="text-xs text-ink-400">
            Made in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}
