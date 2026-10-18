"use client";

import { useTranslations } from "next-intl";
import { cn } from "cn";
import { CATEGORY_ICONS } from "@/components/heat/categoryIcon";
import { Card, CardContent } from "@/components/ui/card";
import { categoryLabel } from "@/lib/i18nLabels";
import type { PlaceHeat } from "@/store/useHeatStore";

interface PlaceStripProps {
  places: PlaceHeat[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
}

export function PlaceStrip({ places, selectedPlaceId, onSelectPlace }: PlaceStripProps) {
  const t = useTranslations();
  const sorted = places.slice().sort((a, b) => b.heat.current.heatIndexC - a.heat.current.heatIndexC);

  return (
    <ul
      aria-label={t("map.title")}
      className="flex snap-x gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:thin]"
    >
      {sorted.map(({ place, heat }) => {
        const { category, heatIndexC } = heat.current;
        const Icon = CATEGORY_ICONS[category.id];
        const hi = Math.round(heatIndexC);
        const selected = place.id === selectedPlaceId;
        return (
          <li key={place.id} className="snap-start">
            <Card
              size="sm"
              className={cn(
                "min-w-28 py-0 shadow-none ring-foreground/10 transition",
                selected && "ring-2 ring-foreground",
              )}
            >
              <CardContent className="p-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={t("map.circleAria", {
                    place: place.name,
                    hi,
                    category: categoryLabel(t, category.id),
                  })}
                  onClick={() => onSelectPlace(place.id)}
                  className="flex w-full flex-col items-start gap-1 px-2.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                >
                  <span className="flex w-full items-center justify-between gap-1.5">
                    <span className="text-lg font-bold tabular-nums leading-none">{hi}°</span>
                    <span
                      className="flex size-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: category.color, color: category.contrastText }}
                    >
                      <Icon aria-hidden className="size-3" />
                    </span>
                  </span>
                  <span className="max-w-24 truncate text-xs font-semibold leading-tight">{place.name}</span>
                </button>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
