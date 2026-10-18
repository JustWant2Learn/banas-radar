"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { LocateFixed, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { HeatReadoutSheet } from "@/components/heat/HeatReadoutSheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapFlyTo } from "@/lib/mapFeatures";
import { areaLevelLabel } from "@/lib/i18nLabels";
import { useHeatStore } from "@/store/useHeatStore";
import { useLocationStore } from "@/store/useLocationStore";
import { useOnline } from "@/hooks/useOnline";
import { VulnerableBanner } from "@/components/profile/VulnerableBanner";
import { MapLegend } from "./MapLegend";
import { PlaceSearch } from "./PlaceSearch";
import { PlaceStrip } from "./PlaceStrip";
import { RadarSweep } from "./RadarSweep";

const RadarMap = dynamic(() => import("./RadarMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

export function RadarView() {
  const t = useTranslations();
  const format = useFormatter();
  const online = useOnline();

  const { userPosition, status: locStatus, requestLocation } = useLocationStore();
  const {
    status,
    byPlaceId,
    areas,
    updatedAt,
    isStale,
    selectedPlaceId,
    inspect,
    loadMajorPlaces,
    selectPlace,
    selectArea,
    clearInspect,
  } = useHeatStore();
  const [focusNonce, setFocusNonce] = useState(0);
  const [flyTo, setFlyTo] = useState<MapFlyTo | null>(null);

  useEffect(() => {
    void loadMajorPlaces();
    requestLocation();
  }, [loadMajorPlaces, requestLocation]);

  const places = useMemo(() => Object.values(byPlaceId), [byPlaceId]);
  const selected = selectedPlaceId ? (byPlaceId[selectedPlaceId] ?? null) : null;
  const loading = status === "loading" || status === "idle";

  const readout = inspect
    ? {
        title: inspect.name,
        subtitle: areaLevelLabel(t, inspect.subtitle),
        heatIndexC: inspect.heatIndexC,
        temperatureC: inspect.temperatureC,
        humidity: inspect.humidity,
        category: inspect.category,
        hottestName: inspect.hottestName,
        hottestHeatIndexC: inspect.hottestHeatIndexC,
      }
    : selected
      ? {
          title: selected.place.name,
          subtitle: selected.place.region,
          heatIndexC: selected.heat.current.heatIndexC,
          temperatureC: selected.heat.current.temperatureC,
          humidity: selected.heat.current.humidity,
          category: selected.heat.current.category,
        }
      : null;

  return (
    <section className="relative flex h-full flex-col" aria-busy={loading}>
      <div className="relative flex-1">
        <RadarMap
          userPosition={userPosition}
          focusNonce={focusNonce}
          flyTo={flyTo}
          areas={areas}
          selectedPsgc={inspect?.psgc ?? null}
          onSelectArea={selectArea}
        />
        <RadarSweep active={loading} />

        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[72%] flex-col gap-2">
          <Card size="sm" className="pointer-events-auto py-2 shadow-md ring-foreground/8">
            <CardContent className="px-3">
              {loading && (
                <p className="flex items-center gap-2 text-sm font-medium" role="status">
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t("map.scanning")}
                </p>
              )}
              {status === "ready" && updatedAt && (
                <p className="text-sm text-muted-foreground">
                  {t("map.updated", {
                    time: format.dateTime(updatedAt, { hour: "numeric", minute: "2-digit" }),
                  })}
                </p>
              )}
              {status === "error" && (
                <Alert variant="destructive" className="border-0 p-0 shadow-none">
                  <AlertTitle>{t("map.loadError")}</AlertTitle>
                  <AlertDescription>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => void loadMajorPlaces()}>
                      <RefreshCw data-icon="inline-start" />
                      {t("map.retry")}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {(isStale || !online) && status !== "error" && (
            <Alert className="pointer-events-auto border-amber-300 bg-amber-50 text-amber-950 shadow-md">
              <WifiOff />
              <AlertTitle>{t("map.offline")}</AlertTitle>
            </Alert>
          )}

          {locStatus === "denied" && (
            <Alert className="pointer-events-auto bg-card/95 shadow-md">
              <AlertDescription>{t("map.locationDenied")}</AlertDescription>
            </Alert>
          )}

          <div className="pointer-events-auto">
            <VulnerableBanner />
          </div>
        </div>

        <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2">
          <PlaceSearch
            areas={areas?.areas ?? null}
            onSelect={(psgc) => {
              const reading = areas?.areas[psgc];
              selectArea(psgc);
              if (!reading) return;
              setFlyTo({
                lat: reading.lat,
                lon: reading.lon,
                level: reading.level,
                nonce: Date.now(),
              });
            }}
          />
          <Button
            size="icon-lg"
            variant="outline"
            className="size-11 rounded-full bg-card shadow-md"
            aria-label={locStatus === "locating" ? t("map.locating") : t("map.locate")}
            onClick={() => {
              setFocusNonce((n) => n + 1);
              requestLocation({ centerMap: true });
            }}
            disabled={locStatus === "locating"}
          >
            {locStatus === "locating" ? (
              <Loader2 aria-hidden className="size-5 animate-spin" />
            ) : (
              <LocateFixed aria-hidden className="size-5" />
            )}
          </Button>
        </div>

        <div className="absolute bottom-3 right-3 z-[500]">
          <MapLegend />
        </div>
      </div>

      <div className="border-t bg-card">
        {places.length > 0 ? (
          <PlaceStrip places={places} selectedPlaceId={selectedPlaceId} onSelectPlace={selectPlace} />
        ) : (
          <div className="flex gap-1.5 px-3 py-2" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-28 shrink-0 rounded-xl" />
            ))}
          </div>
        )}
      </div>

      <HeatReadoutSheet readout={readout} onClose={clearInspect} />
    </section>
  );
}
