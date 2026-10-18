"use client";

import { useTranslations } from "next-intl";
import { Droplets, MapPin, Thermometer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryBadge } from "@/components/heat/CategoryBadge";
import { CATEGORY_ICONS } from "@/components/heat/categoryIcon";
import type { PlaceHeat } from "@/store/useHeatStore";

interface PlaceSheetProps {
  placeHeat: PlaceHeat | null;
  onClose: () => void;
}

/** Bottom sheet showing the readout for a tapped place. */
export function PlaceSheet({ placeHeat, onClose }: PlaceSheetProps) {
  const t = useTranslations();

  const open = placeHeat !== null;
  const current = placeHeat?.heat.current;
  const category = current?.category;
  const Icon = category ? CATEGORY_ICONS[category.id] : MapPin;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        {placeHeat && current && category && (
          <>
            <SheetHeader className="pb-0">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <MapPin aria-hidden className="size-5 text-muted-foreground" />
                {placeHeat.place.name}
              </SheetTitle>
              <SheetDescription>{placeHeat.place.region}</SheetDescription>
            </SheetHeader>

            <div className="flex items-center gap-4 px-4">
              <div
                className="flex size-20 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: category.color, color: category.contrastText }}
              >
                <Icon aria-hidden className="size-10" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">{t("map.heatIndex")}</span>
                <span className="text-5xl font-bold leading-none tabular-nums">
                  {Math.round(current.heatIndexC)}°C
                </span>
                <CategoryBadge category={category} size="lg" className="mt-1 w-fit" />
              </div>
            </div>

            <dl className="flex gap-4 px-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Thermometer aria-hidden className="size-4 text-muted-foreground" />
                <dt className="sr-only">{t("map.feelsLike")}</dt>
                <dd className="tabular-nums">{Math.round(current.temperatureC)}°C</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets aria-hidden className="size-4 text-muted-foreground" />
                <dt className="sr-only">RH</dt>
                <dd className="tabular-nums">{Math.round(current.humidity)}%</dd>
              </div>
            </dl>

            <Card size="sm" className="mx-4 mb-2 shadow-none">
              <CardContent className="text-base leading-snug">{t(`tip.${category.id}`)}</CardContent>
            </Card>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
