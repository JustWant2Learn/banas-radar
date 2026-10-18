"use client";

import {
  geoContains,
  geoMercator,
  geoPath,
  pointer,
  select,
  zoom as d3zoom,
  zoomIdentity,
  type GeoProjection,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getCategoryById } from "@/lib/heatIndex";
import { categoryLabel, officialTip } from "@/lib/i18nLabels";
import {
  CITY_ZOOM,
  levelForScale,
  loadDrawnAreas,
  scaleForLevel,
  type DrawnArea,
  type MapFlyTo,
} from "@/lib/mapFeatures";
import type { AreaReading, HeatAreasPayload } from "@/lib/heatAreasTypes";
import type { AreaLevel } from "@/lib/psgc";
import type { LatLng } from "@/lib/places";

interface RadarMapProps {
  userPosition: LatLng | null;
  focusNonce: number;
  flyTo: MapFlyTo | null;
  areas: HeatAreasPayload | null;
  selectedPsgc: string | null;
  onSelectArea: (psgc: string) => void;
}

interface HoverState {
  psgc: string;
  x: number;
  y: number;
}

const SEA = "#cfe8f3";
const MISSING = "#d1d5db";
const STROKE = "#ffffff";

export default function RadarMap({
  userPosition,
  focusNonce,
  flyTo,
  areas,
  selectedPsgc,
  onSelectArea,
}: RadarMapProps) {
  const t = useTranslations();
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const projectionRef = useRef<GeoProjection | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const areasByLevel = useRef<Partial<Record<AreaLevel, DrawnArea[]>>>({});
  const currentLevel = useRef<AreaLevel>("region");

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [level, setLevel] = useState<AreaLevel>("region");
  const [baseLand, setBaseLand] = useState<DrawnArea[]>([]);
  const [drawn, setDrawn] = useState<DrawnArea[]>([]);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<HoverState | null>(null);

  const readings = areas?.areas ?? null;

  const projection = useMemo(() => {
    if (size.width < 8 || size.height < 8 || baseLand.length === 0) return null;
    return geoMercator().fitExtent(
      [
        [16, 16],
        [size.width - 16, size.height - 16],
      ],
      {
        type: "FeatureCollection",
        features: baseLand.map((area) => area.feature),
      },
    );
  }, [baseLand, size.height, size.width]);

  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = { width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) };
      sizeRef.current = next;
      setSize(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadDrawnAreas("region").then((features) => {
      if (cancelled) return;
      areasByLevel.current.region = features;
      currentLevel.current = "region";
      setBaseLand(features);
      setDrawn(features);
      setLevel("region");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureLevel = useCallback(async (next: AreaLevel) => {
    if (areasByLevel.current[next]) {
      currentLevel.current = next;
      setLevel(next);
      setDrawn(areasByLevel.current[next] ?? []);
      return;
    }
    const features = await loadDrawnAreas(next);
    areasByLevel.current[next] = features;
    currentLevel.current = next;
    setLevel(next);
    setDrawn(features);
  }, []);

  const pickArea = useCallback(
    (event: { currentTarget: SVGSVGElement; nativeEvent: MouseEvent | PointerEvent }): DrawnArea | null => {
      const proj = projectionRef.current;
      if (!proj) return null;
      const [x, y] = pointer(event.nativeEvent, event.currentTarget);
      const inverted = transformRef.current.invert([x, y]);
      const lonlat = proj.invert?.(inverted);
      if (!lonlat) return null;
      return drawn.find((area) => geoContains(area.feature, lonlat)) ?? null;
    },
    [drawn],
  );

  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode || size.width < 8) return;
    const svg = select(svgNode);
    const zoom = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 28])
      .extent([
        [0, 0],
        [size.width, size.height],
      ])
      .translateExtent([
        [-size.width * 0.2, -size.height * 0.2],
        [size.width * 1.2, size.height * 1.2],
      ])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        setTransform(event.transform);
        const nextLevel = levelForScale(event.transform.k);
        if (nextLevel !== currentLevel.current) {
          void ensureLevel(nextLevel);
        }
      });
    zoomRef.current = zoom;
    svg.call(zoom);
    return () => {
      svg.on(".zoom", null);
    };
  }, [ensureLevel, size.height, size.width]);

  useEffect(() => {
    if (!userPosition || focusNonce === 0) return;
    const svgNode = svgRef.current;
    const zoom = zoomRef.current;
    const proj = projectionRef.current;
    if (!svgNode || !zoom || !proj) return;
    const point = proj([userPosition.lon, userPosition.lat]);
    if (!point) return;
    const k = Math.max(CITY_ZOOM + 0.4, 6);
    const next = zoomIdentity
      .translate(size.width / 2 - point[0] * k, size.height / 2 - point[1] * k)
      .scale(k);
    select(svgNode).transition().duration(650).call(zoom.transform, next);
    void ensureLevel("city");
  }, [ensureLevel, focusNonce, size.height, size.width, userPosition]);

  useEffect(() => {
    if (!flyTo || flyTo.nonce === 0) return;
    const svgNode = svgRef.current;
    const zoom = zoomRef.current;
    const proj = projectionRef.current;
    if (!svgNode || !zoom || !proj) return;
    const point = proj([flyTo.lon, flyTo.lat]);
    if (!point) return;
    const k = scaleForLevel(flyTo.level);
    const next = zoomIdentity
      .translate(size.width / 2 - point[0] * k, size.height / 2 - point[1] * k)
      .scale(k);
    select(svgNode).transition().duration(650).call(zoom.transform, next);
    void ensureLevel(flyTo.level);
  }, [ensureLevel, flyTo, size.height, size.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const proj = projection;
    if (!canvas || !proj || size.width < 8) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    if (level !== "city") return;

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    const path = geoPath(proj, ctx);
    for (const area of drawn) {
      ctx.beginPath();
      path(area.feature);
      ctx.fillStyle = fillFor(area.psgc, readings, selectedPsgc);
      ctx.fill();
      ctx.strokeStyle = STROKE;
      ctx.lineWidth = 0.45 / transform.k;
      ctx.stroke();
    }
    ctx.restore();
  }, [drawn, level, readings, selectedPsgc, size.height, size.width, transform, projection]);

  const pathGen = useMemo(() => (projection ? geoPath(projection) : null), [projection]);
  const useSvg = level !== "city";

  const hoverReading = hover && readings ? readings[hover.psgc] : null;
  const hoverArea = hover ? drawn.find((area) => area.psgc === hover.psgc) : null;

  function projectMarker(lat: number, lon: number): { x: number; y: number } | null {
    const point = projection?.([lon, lat]);
    if (!point) return null;
    return { x: transform.applyX(point[0]), y: transform.applyY(point[1]) };
  }

  const userDot = userPosition ? projectMarker(userPosition.lat, userPosition.lon) : null;
  const highDot = areas ? projectMarker(areas.hottest.lat, areas.hottest.lon) : null;
  const lowDot = areas ? projectMarker(areas.coolest.lat, areas.coolest.lon) : null;

  return (
    <div
      ref={rootRef}
      className="ph-map relative h-full w-full overflow-hidden"
      style={{ background: SEA, touchAction: "none" }}
      aria-label={t("map.title")}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        onClick={(event) => {
          const area = pickArea(event);
          if (area) onSelectArea(area.psgc);
        }}
        onPointerMove={(event) => {
          const area = pickArea(event);
          if (!area) {
            setHover(null);
            return;
          }
          const rect = rootRef.current?.getBoundingClientRect();
          setHover({
            psgc: area.psgc,
            x: event.clientX - (rect?.left ?? 0),
            y: event.clientY - (rect?.top ?? 0),
          });
        }}
        onPointerLeave={() => setHover(null)}
      >
        {useSvg && pathGen && (
          <g transform={transform.toString()}>
            {drawn.map((area) => (
              <path
                key={area.psgc}
                d={pathGen(area.feature) ?? undefined}
                fill={fillFor(area.psgc, readings, selectedPsgc)}
                stroke={STROKE}
                strokeWidth={0.7 / transform.k}
                role="button"
                tabIndex={0}
                aria-label={area.name}
                style={{ cursor: "pointer" }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectArea(area.psgc);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectArea(area.psgc);
                  }
                }}
                onPointerEnter={(event) => {
                  const rect = rootRef.current?.getBoundingClientRect();
                  setHover({
                    psgc: area.psgc,
                    x: event.clientX - (rect?.left ?? 0),
                    y: event.clientY - (rect?.top ?? 0),
                  });
                }}
                onPointerMove={(event) => {
                  const rect = rootRef.current?.getBoundingClientRect();
                  setHover({
                    psgc: area.psgc,
                    x: event.clientX - (rect?.left ?? 0),
                    y: event.clientY - (rect?.top ?? 0),
                  });
                }}
                onPointerLeave={() => setHover(null)}
              />
            ))}
          </g>
        )}
      </svg>

      {highDot && areas && (
        <Callout x={highDot.x} y={highDot.y} kind="high" label={`${t("map.highest")}: ${areas.hottest.name} · ${Math.round(areas.hottest.heatIndexC)}°`} />
      )}
      {lowDot && areas && (
        <Callout x={lowDot.x} y={lowDot.y} kind="low" label={`${t("map.lowest")}: ${areas.coolest.name} · ${Math.round(areas.coolest.heatIndexC)}°`} />
      )}
      {userDot && (
        <div
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
          style={{ left: userDot.x, top: userDot.y }}
          title={t("map.yourLocation")}
        />
      )}

      {hover && hoverArea && (
        <div
          className="pointer-events-none absolute z-20 max-w-56 rounded-xl bg-white/96 px-2.5 py-2 text-xs shadow-md ring-1 ring-foreground/8"
          style={{ left: Math.min(hover.x + 12, size.width - 180), top: Math.max(8, hover.y - 8) }}
        >
          <p className="font-semibold leading-tight">{hoverArea.name}</p>
          {hoverReading ? (
            <>
              <p className="mt-1 tabular-nums">
                {Math.round(hoverReading.heatIndexC)}°C · {categoryLabel(t, hoverReading.majorityCategory)}
              </p>
              <p className="mt-1 leading-snug">
                {t("map.hottestInArea", {
                  place: hoverReading.hottestName,
                  value: Math.round(hoverReading.hottestHeatIndexC),
                })}
              </p>
              <p className="mt-1 leading-snug text-muted-foreground">
                {officialTip(t, hoverReading.majorityCategory)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">{t("common.loading")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function fillFor(psgc: string, readings: Record<string, AreaReading> | null, selectedPsgc: string | null): string {
  const reading = readings?.[psgc];
  const color = reading ? getCategoryById(reading.majorityCategory).color : MISSING;
  if (selectedPsgc === psgc) return color;
  return color;
}

function Callout({ x, y, kind, label }: { x: number; y: number; kind: "high" | "low"; label: string }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-y-1/2"
      style={{ left: x + 8, top: y }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: kind === "high" ? "#dc2626" : "#16a34a" }}
        />
        <span className="rounded-full bg-white/96 px-2 py-0.5 text-[11px] font-bold shadow-md">{label}</span>
      </div>
    </div>
  );
}
