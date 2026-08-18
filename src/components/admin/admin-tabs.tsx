"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumnIcon, ClipboardListIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin", label: "Kitchen queue", icon: ClipboardListIcon },
  { href: "/admin/dashboard", label: "Dashboard", icon: ChartColumnIcon },
];

/**
 * Section switcher for the admin area.
 *
 * These are two separate routes, not in-page panels, so this uses links with
 * `aria-current="page"` rather than the Radix Tabs component — `role="tab"`
 * would misdescribe the behaviour to assistive tech.
 */
export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1.5">
      {SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            // The dashboard runs aggregate queries; don't fire them on hover.
            prefetch={section.href === "/admin/dashboard" ? false : undefined}
            className={cn(
              "focus-visible:ring-ring flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
              active
                ? "bg-brand-gradient text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <section.icon className="size-4" aria-hidden />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
