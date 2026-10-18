"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { useProfileStore } from "@/store/useProfileStore";

export function ProfileHeaderLink() {
  const t = useTranslations("vulnerable");
  const pathname = usePathname();
  const groups = useProfileStore((state) => state.groups);
  const active = pathname === "/you";

  return (
    <Link
      href="/you"
      aria-current={active ? "page" : undefined}
      aria-label={t("openMode")}
      className={cn(
        buttonVariants({ variant: "outline", size: "icon-lg" }),
        "relative size-11 rounded-full",
        active && "border-primary text-primary",
      )}
    >
      <Users aria-hidden className="size-5" />
      {groups.length > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {groups.length}
        </span>
      )}
    </Link>
  );
}
