"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Droplets, MapPin, Snowflake, Thermometer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryBadge } from "@/components/heat/CategoryBadge";
import { CATEGORY_ICONS } from "@/components/heat/categoryIcon";
import { cn } from "cn";
import type { HeatCategory } from "@/lib/heatIndex";
import { classifyForGroups, personalCategoryDiffers } from "@/lib/vulnerable";
import { categoryLabel, officialTip, vulnerableExtraTip } from "@/lib/i18nLabels";
import { useProfileStore } from "@/store/useProfileStore";

export interface HeatReadout {
  title: string;
  subtitle: string;
  heatIndexC: number;
  temperatureC: number;
  humidity: number;
  category: HeatCategory;
  hottestName?: string;
  hottestHeatIndexC?: number;
}

interface HeatReadoutSheetProps {
  readout: HeatReadout | null;
  onClose: () => void;
}

export function HeatReadoutSheet({ readout, onClose }: HeatReadoutSheetProps) {
  const t = useTranslations();
  const groups = useProfileStore((state) => state.groups);
  const category = readout?.category;
  const Icon = category ? CATEGORY_ICONS[category.id] : MapPin;
  const personal = readout ? classifyForGroups(readout.heatIndexC, groups) : null;
  const showPersonal = Boolean(
    category && personal && personalCategoryDiffers(category.id, personal.id),
  );

  return (
    <Dialog open={readout !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-8rem)] w-[calc(100%-2.5rem)] gap-2.5 overflow-y-auto rounded-2xl p-3.5 sm:max-w-[22rem]">
        {readout && category && (
          <>
            <DialogHeader className="gap-0.5 pr-7">
              <DialogTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <MapPin aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{readout.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">{readout.subtitle}</DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2.5">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: category.color, color: category.contrastText }}
              >
                <Icon aria-hidden className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("map.heatIndex")}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-2xl leading-none font-bold tabular-nums">
                    {Math.round(readout.heatIndexC)}°C
                  </span>
                  <CategoryBadge category={category} size="sm" />
                </div>
                {readout.hottestName != null && readout.hottestHeatIndexC != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("map.hottestInArea", {
                      place: readout.hottestName,
                      value: Math.round(readout.hottestHeatIndexC),
                    })}
                  </p>
                )}
              </div>
            </div>

            <dl className="flex gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Thermometer aria-hidden className="size-3.5" />
                <dt className="sr-only">{t("map.feelsLike")}</dt>
                <dd className="tabular-nums">{Math.round(readout.temperatureC)}°C</dd>
              </div>
              <div className="flex items-center gap-1">
                <Droplets aria-hidden className="size-3.5" />
                <dt className="sr-only">RH</dt>
                <dd className="tabular-nums">{Math.round(readout.humidity)}%</dd>
              </div>
            </dl>

            <p className="rounded-xl bg-muted/70 px-2.5 py-2 text-xs leading-relaxed">
              {officialTip(t, category.id)}
            </p>

            {showPersonal && personal && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-2">
                <span className="text-xs font-semibold text-orange-950">
                  {t("vulnerable.treatAs", { category: categoryLabel(t, personal.id) })}
                </span>
                <CategoryBadge category={personal} size="sm" className="w-fit" />
              </div>
            )}

            {groups.map((id) => (
              <p
                key={id}
                className="rounded-xl bg-primary/5 px-2.5 py-2 text-xs leading-relaxed text-foreground"
              >
                {vulnerableExtraTip(t, id)}
              </p>
            ))}

            {groups.length > 0 && (
              <Link
                href="/cooling"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
              >
                <Snowflake data-icon="inline-start" />
                {t("vulnerable.findCool")}
              </Link>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
