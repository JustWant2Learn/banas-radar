"use client";

import { useTranslations } from "next-intl";
import { cn } from "cn";
import type { HeatCategory } from "@/lib/heatIndex";
import { CATEGORY_ICONS } from "./categoryIcon";

interface CategoryBadgeProps {
  category: HeatCategory;
  size?: "sm" | "lg";
  className?: string;
}

/** Colour + icon + label pill for a heat category. */
export function CategoryBadge({ category, size = "sm", className }: CategoryBadgeProps) {
  const t = useTranslations("category");
  const Icon = CATEGORY_ICONS[category.id];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold leading-none",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-base",
        className,
      )}
      style={{ backgroundColor: category.color, color: category.contrastText }}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-5"} />
      {t(category.id)}
    </span>
  );
}
