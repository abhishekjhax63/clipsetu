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
  const hrefs = [
    "/dashboard",
    role === "brand" ? "/dashboard/campaigns" : "/dashboard/discover",
    "/dashboard/wallet",
    "/dashboard/notifications",
    "/dashboard/support",
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
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
            isActive(pathname, item.href)
              ? "bg-ink-900 text-white"
              : "text-ink-600 hover:bg-surface-muted hover:text-ink-900"
          )}
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = primaryForRole(role);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex max-w-6xl items-stretch justify-between px-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-ink-900" : "text-ink-400"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", active && "text-mint-600")}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
