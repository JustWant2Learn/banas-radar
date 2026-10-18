"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { HEAT_CATEGORIES } from "@/lib/heatIndex";
import { CATEGORY_ICONS } from "@/components/heat/categoryIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { categoryLabel } from "@/lib/i18nLabels";
import { cn } from "cn";

function rangeLabel(min: number, max: number | null): string {
  if (!Number.isFinite(min)) return `≤${max}°`;
  if (max === null) return `${min}°+`;
  return `${min}–${max}°`;
}

export function MapLegend() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        size="sm"
        className="bg-card/95 py-2 shadow-md ring-foreground/8 backdrop-blur supports-backdrop-filter:bg-card/85"
      >
        <CardContent className="flex flex-col px-2.5">
          <CollapsibleContent>
            <ul className="mb-2 flex flex-col gap-1.5" aria-label={t("map.legendAria")}>
              {HEAT_CATEGORIES.map((category) => {
                const Icon = CATEGORY_ICONS[category.id];
                return (
                  <li key={category.id} className="flex items-center gap-2">
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: category.color, color: category.contrastText }}
                    >
                      <Icon aria-hidden className="size-3" />
                    </span>
                    <span className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold">{categoryLabel(t, category.id)}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {rangeLabel(category.min, category.max)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CollapsibleContent>
          <CollapsibleTrigger
            className="flex w-full items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={open ? t("map.legendHide") : t("map.legendShow")}
          >
            {!open && (
              <span className="flex items-center -space-x-0.5" aria-hidden>
                {HEAT_CATEGORIES.map((category) => (
                  <span
                    key={category.id}
                    className="size-3.5 rounded-full ring-2 ring-card"
                    style={{ backgroundColor: category.color }}
                  />
                ))}
              </span>
            )}
            {open && <span className="text-xs font-semibold">{t("map.legend")}</span>}
            <ChevronDown
              aria-hidden
              className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            />
          </CollapsibleTrigger>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
