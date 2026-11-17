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

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-ink-900 text-white"
                : "text-ink-600 hover:bg-surface-muted hover:text-ink-900"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
