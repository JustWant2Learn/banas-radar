"use client";

import { useTranslations } from "next-intl";
import { BookOpen, Clock, Droplets, Landmark, MapPinned, Navigation, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { directionsUrl, type CoolingKind, type CoolingPlace } from "@/lib/cooling";
import { splitDistance, walkingMinutes } from "@/lib/geo";
import { coolingKindHint, coolingKindLabel } from "@/lib/i18nLabels";

const KIND_ICONS = {
  mall: Store,
  library: BookOpen,
  lgu: Landmark,
  water: Droplets,
} as const;

export function CoolingPlaceCard({ place }: { place: CoolingPlace }) {
  const t = useTranslations();
  const Icon = KIND_ICONS[place.kind];
  const distance = splitDistance(place.distanceM);
  const distanceLabel =
    distance.unit === "m"
      ? t("cooling.distanceM", { value: distance.value })
      : t("cooling.distanceKm", { value: distance.value });

  return (
    <Card size="sm" className="shadow-none">
      <CardHeader className="grid-cols-[auto_1fr] items-start gap-x-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
          <Icon aria-hidden className="size-5" />
        </span>
        <CardTitle className="text-lg font-semibold leading-snug">{place.name}</CardTitle>
        <CardDescription className="col-start-2 flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <KindBadge kind={place.kind} />
            <span className="font-semibold text-foreground">{distanceLabel}</span>
            <span aria-hidden>·</span>
            <span>{t("cooling.walk", { minutes: walkingMinutes(place.distanceM) })}</span>
          </span>
          {place.address && (
            <span className="flex items-start gap-1.5">
              <MapPinned aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {place.address}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      {place.openingHours && (
        <CardContent className="flex items-center gap-1.5 text-sm">
          <Clock aria-hidden className="size-3.5 text-muted-foreground" />
          <span>
            {t("cooling.hours")}: {place.openingHours}
          </span>
        </CardContent>
      )}
      <CardFooter className="border-0 bg-transparent">
        <a
          href={directionsUrl(place.lat, place.lon)}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          <Navigation data-icon="inline-start" />
          {t("cooling.directions")}
        </a>
      </CardFooter>
    </Card>
  );
}

function KindBadge({ kind }: { kind: CoolingKind }) {
  const t = useTranslations();
  return (
    <Badge variant="secondary" title={coolingKindHint(t, kind)}>
      {coolingKindLabel(t, kind)}
    </Badge>
  );
}
