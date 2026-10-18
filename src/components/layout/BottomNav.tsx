"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bookmark, HeartPulse, Radar, Snowflake } from "lucide-react";
import { cn } from "cn";

const ITEMS = [
  { href: "/", key: "radar", icon: Radar },
  { href: "/cooling", key: "cool", icon: Snowflake },
  { href: "/saved", key: "saved", icon: Bookmark },
  { href: "/first-aid", key: "guide", icon: HeartPulse },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/80"
    >
      <ul className="mx-auto flex max-w-lg justify-around">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-6" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
