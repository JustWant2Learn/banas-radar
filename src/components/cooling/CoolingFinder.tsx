"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BookOpen, Droplets, Landmark, Loader2, LocateFixed, RefreshCw, Store, WifiOff } from "lucide-react";
import { VulnerableBanner } from "@/components/profile/VulnerableBanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cachedFetch } from "@/lib/cache";
import {
  COOLING_KIND_IDS,
  DEFAULT_COOLING_RADIUS_M,
  isCoolingPayload,
  type CoolingKind,
  type CoolingPayload,
} from "@/lib/cooling";
import { coolingKindLabel } from "@/lib/i18nLabels";
import { METRO_MANILA_CENTER } from "@/lib/places";
import { useLocationStore } from "@/store/useLocationStore";
import { useOnline } from "@/hooks/useOnline";
import { CoolingPlaceCard } from "./CoolingPlaceCard";

const KIND_ICONS = {
  mall: Store,
  library: BookOpen,
  lgu: Landmark,
  water: Droplets,
} as const;

export function CoolingFinder() {
  const t = useTranslations();
  const format = useFormatter();
  const online = useOnline();
  const { userPosition, status: locStatus, requestLocation } = useLocationStore();
  const [kind, setKind] = useState<CoolingKind | null>(null);
  const [radiusM, setRadiusM] = useState(DEFAULT_COOLING_RADIUS_M);
  const [payload, setPayload] = useState<CoolingPayload | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const origin = userPosition ?? METRO_MANILA_CENTER;

  const load = useCallback(async () => {
    setStatus("loading");
    const params = new URLSearchParams({
      lat: String(origin.lat),
      lon: String(origin.lon),
      radius: String(radiusM),
    });
    if (kind) params.set("kind", kind);
    try {
      const hit = await cachedFetch<CoolingPayload>(
        `cooling:${params.toString()}`,
        async () => {
          const response = await fetch(`/api/cooling?${params.toString()}`);
          if (!response.ok) throw new Error(`Cooling search failed (${response.status})`);
          const json: unknown = await response.json();
          if (!isCoolingPayload(json)) throw new Error("Unexpected cooling payload");
          return json;
        },
      );
      setPayload(hit.value);
      setIsStale(hit.isStale);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [kind, origin.lat, origin.lon, radiusM]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    void load();
  }, [load]);

  const places = payload?.places ?? [];
  const countLabel = useMemo(
    () => t("cooling.count", { count: places.length }),
    [places.length, t],
  );

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{t("cooling.heading")}</h1>
            <p className="text-base leading-relaxed text-muted-foreground">{t("cooling.body")}</p>
          </div>
          <Button
            size="icon-lg"
            variant="outline"
            className="size-11 shrink-0 rounded-full"
            aria-label={locStatus === "locating" ? t("cooling.locating") : t("cooling.locate")}
            onClick={() => requestLocation({ centerMap: true })}
            disabled={locStatus === "locating"}
          >
            {locStatus === "locating" ? (
              <Loader2 aria-hidden className="size-5 animate-spin" />
            ) : (
              <LocateFixed aria-hidden className="size-5" />
            )}
          </Button>
        </div>
        {status === "ready" && <p className="text-sm font-semibold">{countLabel}</p>}
      </header>

      <VulnerableBanner />

      {locStatus === "denied" && (
        <Alert>
          <AlertDescription>{t("cooling.locationDenied")}</AlertDescription>
        </Alert>
      )}

      {(isStale || !online) && status !== "error" && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <WifiOff />
          <AlertTitle>{t("cooling.offline")}</AlertTitle>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("cooling.heading")}>
        <Toggle
          variant="outline"
          pressed={kind === null}
          onPressedChange={() => setKind(null)}
          className="rounded-full px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {t("cooling.kindAll")}
        </Toggle>
        {COOLING_KIND_IDS.map((id) => {
          const Icon = KIND_ICONS[id];
          return (
            <Toggle
              key={id}
              variant="outline"
              pressed={kind === id}
              onPressedChange={(next) => setKind(next ? id : null)}
              className="rounded-full px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Icon data-icon="inline-start" />
              {coolingKindLabel(t, id)}
            </Toggle>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRadiusM(radiusM >= 12_000 ? DEFAULT_COOLING_RADIUS_M : 12_000)}
        >
          {radiusM >= 12_000 ? t("cooling.nearer") : t("cooling.farther")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={status === "loading"}>
          <RefreshCw data-icon="inline-start" />
          {t("cooling.retry")}
        </Button>
      </div>

      {status === "loading" && (
        <p className="flex items-center gap-2 text-sm font-medium" role="status">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {t("cooling.scanning")}
        </p>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>{t("cooling.loadError")}</AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => void load()}>
              <RefreshCw data-icon="inline-start" />
              {t("cooling.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status === "ready" && places.length === 0 && (
        <p className="text-base leading-relaxed text-muted-foreground">
          {t("cooling.empty", { km: format.number(radiusM / 1000, { maximumFractionDigits: 0 }) })}
        </p>
      )}

      {places.length > 0 && (
        <ul className="flex flex-col gap-3">
          {places.map((place) => (
            <li key={place.id}>
              <CoolingPlaceCard place={place} />
            </li>
          ))}
        </ul>
      )}

      {payload?.source === "seed" && (
        <Alert>
          <AlertDescription>{t("cooling.seedNote")}</AlertDescription>
        </Alert>
      )}

      <p className="pb-2 text-xs text-muted-foreground">{t("cooling.osm")}</p>
    </section>
  );
}
