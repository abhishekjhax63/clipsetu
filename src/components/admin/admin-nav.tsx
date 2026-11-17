"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Scale,
  Settings,
  ShieldCheck,
  Users,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Campaigns", href: "/admin/campaigns", icon: Compass },
  { label: "Moderation", href: "/admin/moderation", icon: ShieldCheck },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Disputes", href: "/admin/disputes", icon: Scale },
  { label: "Content", href: "/admin/content", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav({ variant = "bar" }: { variant?: "bar" | "sidebar" }) {
  const pathname = usePathname();

  if (variant === "sidebar") {
    return (
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-surface text-ink-900 shadow-xs"
                  : "text-ink-600 hover:bg-surface-muted hover:text-ink-900"
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

  return (
    <nav className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface text-ink-900 shadow-xs"
                : "text-ink-600 hover:bg-surface-muted hover:text-ink-900"
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
