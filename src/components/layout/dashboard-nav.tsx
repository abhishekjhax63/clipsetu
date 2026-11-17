"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Compass,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Play,
  Settings,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

function itemsForRole(role: UserRole): NavItem[] {
  const isBrand = role === "brand";
  return [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    isBrand
      ? { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone }
      : { label: "Discover", href: "/dashboard/discover", icon: Compass },
    isBrand
      ? { label: "Submissions", href: "/dashboard/campaigns", icon: Play }
      : { label: "My clips", href: "/dashboard/submissions", icon: Play },
    { label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
    { label: "Alerts", href: "/dashboard/notifications", icon: Bell },
    { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];
}

/** The five destinations shown in the mobile bottom bar. */
function primaryForRole(role: UserRole): NavItem[] {
  const all = itemsForRole(role);
  const hrefs =
    role === "brand"
      ? [
          "/dashboard",
          "/dashboard/campaigns",
          "/dashboard/wallet",
          "/dashboard/notifications",
          "/dashboard/settings",
        ]
      : [
          "/dashboard",
          "/dashboard/discover",
          "/dashboard/submissions",
          "/dashboard/wallet",
          "/dashboard/settings",
        ];
  return hrefs
    .map((href) => all.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i));
}

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export function DashboardNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = itemsForRole(role);

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface-muted text-ink-900"
                : "text-ink-600 hover:bg-surface-muted/70 hover:text-ink-900"
            )}
          >
            <item.icon
              className={cn("h-4 w-4", active && "text-brand-600")}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = primaryForRole(role);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex max-w-6xl items-stretch px-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.label} className="relative flex-1">
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-600"
                />
              ) : null}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand-700" : "text-ink-400"
                )}
              >
                <item.icon
                  className={cn("h-[22px] w-[22px]", active && "text-brand-600")}
                  aria-hidden="true"
                />
                <span className={cn(active && "font-semibold")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
