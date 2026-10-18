import { flatten } from "@turf/flatten";
import { featureCollection, point } from "@turf/helpers";
import { interpolate } from "@turf/interpolate";
import { intersect } from "@turf/intersect";
import { isobands } from "@turf/isobands";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { classifyHeatIndex, heatIndexCelsius, HEAT_CATEGORIES, type HeatCategoryId } from "./heatIndex";
import { interpolateHeatIndex, nearestGridPoint } from "./idw";
import { fetchCurrentForPoints } from "./openMeteo";
import { generatePhGrid, keepLandOrNear, loadPhilippinesBoundary, PH_BBOX, type LandGeometry } from "./phGrid";
import { MAJOR_PLACES } from "./places";
import { getSupabaseAdmin } from "./supabaseAdmin";
import {
  isHeatSurfacePayload,
  type HeatBandProperties,
  type HeatExtremum,
  type HeatGridPoint,
  type HeatSurfacePayload,
} from "./heatSurfaceTypes";

const SURFACE_ID = "latest";
const ISOBAND_BREAKS = [0, 27, 33, 42, 52, 100];
const INTERPOLATE_CELL = 0.25;

export const BAND_COLORS: Record<HeatCategoryId, string> = {
  safe: HEAT_CATEGORIES[0].color,
  caution: HEAT_CATEGORIES[1].color,
  extremeCaution: HEAT_CATEGORIES[2].color,
  danger: HEAT_CATEGORIES[3].color,
  extremeDanger: HEAT_CATEGORIES[4].color,
};

const BAND_META: HeatBandProperties[] = [
  { category: "safe", color: BAND_COLORS.safe },
  { category: "caution", color: BAND_COLORS.caution },
  { category: "extremeCaution", color: BAND_COLORS.extremeCaution },
  { category: "danger", color: BAND_COLORS.danger },
  { category: "extremeDanger", color: BAND_COLORS.extremeDanger },
];

const FILE_CACHE = path.join(process.cwd(), ".next", "cache", "heat-surface.json");

let memorySurface: HeatSurfacePayload | null = null;
let inflightRefresh: Promise<HeatSurfacePayload> | null = null;

export async function getLatestHeatSurface(): Promise<HeatSurfacePayload | null> {
  if (memorySurface) return memorySurface;

  const fromFile = await readFileCache();
  if (fromFile) {
    memorySurface = fromFile;
    return fromFile;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.from("heat_surfaces").select("*").eq("id", SURFACE_ID).maybeSingle();
  if (error || !data) return null;
  const payload = rowToPayload(data);
  if (payload) {
    memorySurface = payload;
    await writeFileCache(payload);
  }
  return payload;
}

export async function refreshHeatSurface(): Promise<HeatSurfacePayload> {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = buildHeatSurface().finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

async function buildHeatSurface(): Promise<HeatSurfacePayload> {
  const land = await loadPhilippinesBoundary();
  const candidates = generatePhGrid();
  const samplePoints = keepLandOrNear(candidates, land);
  const samples = await fetchCurrentForPoints(samplePoints);

  const points: HeatGridPoint[] = samples.map((sample) => ({
    lat: sample.lat,
    lon: sample.lon,
    temperatureC: sample.temperatureC,
    humidity: sample.humidity,
    heatIndexC: heatIndexCelsius(sample.temperatureC, sample.humidity),
    observedAt: sample.time,
  }));

  if (points.length === 0) {
    throw new Error("No heat samples returned for the Philippines grid");
  }

  const bands = buildClippedBands(points, land);
  const hottest = toExtremum(points.reduce((a, b) => (a.heatIndexC >= b.heatIndexC ? a : b)));
  const coolest = toExtremum(points.reduce((a, b) => (a.heatIndexC <= b.heatIndexC ? a : b)));
  const payload: HeatSurfacePayload = {
    generatedAt: new Date().toISOString(),
    bands,
    points,
    hottest,
    coolest,
  };

  memorySurface = payload;
  await writeFileCache(payload);
  await persistSurface(payload);
  return payload;
}

export function inspectSpot(payload: HeatSurfacePayload, lat: number, lon: number) {
  const heatIndexC = interpolateHeatIndex(payload.points, { lat, lon });
  const nearest = nearestGridPoint(payload.points, { lat, lon });
  if (heatIndexC === null || !nearest) return null;
  return {
    lat,
    lon,
    heatIndexC,
    temperatureC: nearest.temperatureC,
    humidity: nearest.humidity,
    category: classifyHeatIndex(heatIndexC),
    nearest,
  };
}

export function buildClippedBands(
  points: readonly HeatGridPoint[],
  land: LandGeometry,
): FeatureCollection<Polygon | MultiPolygon, HeatBandProperties> {
  const fc = featureCollection(
    points.map((p) => point([p.lon, p.lat], { heatIndexC: clampHi(p.heatIndexC) })),
  );
  const grid = interpolate(fc, INTERPOLATE_CELL, {
    gridType: "point",
    property: "heatIndexC",
    units: "degrees",
    weight: 2,
    bbox: PH_BBOX,
  });

  const rawBands = isobands(grid, ISOBAND_BREAKS, {
    zProperty: "heatIndexC",
    breaksProperties: BAND_META,
  });

  const landPolys = landPolygons(land);
  const clipped: Feature<Polygon | MultiPolygon, HeatBandProperties>[] = [];

  for (const band of rawBands.features) {
    const props = toBandProps(band.properties);
    let added = 0;
    for (const landPoly of landPolys) {
      added += clipBandToLand(band, landPoly, props, clipped);
    }
    if (added === 0) {
      for (const island of flattenLand(land)) {
        clipBandToLand(band, island, props, clipped);
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: clipped,
  };
}

function landPolygons(land: LandGeometry): Feature<Polygon | MultiPolygon>[] {
  if (land.type === "FeatureCollection") {
    return land.features.filter(isPolygonFeature);
  }
  return [land];
}

function flattenLand(land: LandGeometry): Feature<Polygon | MultiPolygon>[] {
  const source = land.type === "FeatureCollection" ? land : featureCollection([land]);
  return flatten(source).features.filter(isPolygonFeature);
}

function clipBandToLand(
  band: Feature<Polygon | MultiPolygon>,
  land: Feature<Polygon | MultiPolygon>,
  props: HeatBandProperties,
  out: Feature<Polygon | MultiPolygon, HeatBandProperties>[],
): number {
  try {
    const cut = intersect(featureCollection([band, land]), { properties: props });
    if (!cut) return 0;
    out.push(cut);
    return 1;
  } catch {
    return 0;
  }
}

function isPolygonFeature(feature: Feature): feature is Feature<Polygon | MultiPolygon> {
  return feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon";
}

function toBandProps(properties: GeoJsonPropertiesLike): HeatBandProperties {
  const category = isCategory(properties?.category) ? properties.category : "safe";
  return { category, color: BAND_COLORS[category] };
}

function isCategory(value: unknown): value is HeatCategoryId {
  return (
    value === "safe" ||
    value === "caution" ||
    value === "extremeCaution" ||
    value === "danger" ||
    value === "extremeDanger"
  );
}

function clampHi(value: number): number {
  return Math.min(99.9, Math.max(0.1, value));
}

function toExtremum(point: HeatGridPoint): HeatExtremum {
  const named = nearestNamedPlace(point);
  return {
    lat: point.lat,
    lon: point.lon,
    heatIndexC: point.heatIndexC,
    name: named?.name ?? `${point.lat.toFixed(1)}°N, ${point.lon.toFixed(1)}°E`,
    region: named?.region ?? "Philippines",
  };
}

function nearestNamedPlace(target: HeatGridPoint) {
  let best = MAJOR_PLACES[0];
  let bestD = (best.lat - target.lat) ** 2 + (best.lon - target.lon) ** 2;
  for (const place of MAJOR_PLACES) {
    const d = (place.lat - target.lat) ** 2 + (place.lon - target.lon) ** 2;
    if (d < bestD) {
      best = place;
      bestD = d;
    }
  }
  return bestD <= 0.25 * 0.25 ? best : null;
}

async function readFileCache(): Promise<HeatSurfacePayload | null> {
  try {
    const raw: unknown = JSON.parse(await readFile(FILE_CACHE, "utf8"));
    return isHeatSurfacePayload(raw) ? raw : null;
  } catch {
    return null;
  }
}

async function writeFileCache(payload: HeatSurfacePayload): Promise<void> {
  try {
    await mkdir(path.dirname(FILE_CACHE), { recursive: true });
    await writeFile(FILE_CACHE, JSON.stringify(payload));
  } catch {
    // Cache is optional; the in-memory copy still serves this process.
  }
}

async function persistSurface(payload: HeatSurfacePayload): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const readingRows = payload.points.map((p) => ({
    lat: Number(p.lat.toFixed(2)),
    lon: Number(p.lon.toFixed(2)),
    temperature_c: p.temperatureC,
    humidity: p.humidity,
    heat_index_c: p.heatIndexC,
    observed_at: p.observedAt,
    updated_at: new Date().toISOString(),
  }));

  const { error: readingError } = await admin.from("heat_readings").upsert(readingRows, {
    onConflict: "lat,lon",
  });
  if (readingError) throw readingError;

  const { error: surfaceError } = await admin.from("heat_surfaces").upsert({
    id: SURFACE_ID,
    geojson: payload.bands,
    points: payload.points,
    hottest: payload.hottest,
    coolest: payload.coolest,
    generated_at: payload.generatedAt,
  });
  if (surfaceError) throw surfaceError;
}

function rowToPayload(row: Record<string, unknown>): HeatSurfacePayload | null {
  const payload = {
    generatedAt: typeof row.generated_at === "string" ? row.generated_at : new Date().toISOString(),
    bands: row.geojson,
    points: row.points,
    hottest: row.hottest,
    coolest: row.coolest,
  };
  return isHeatSurfacePayload(payload) ? payload : null;
}

type GeoJsonPropertiesLike = { category?: unknown } | null | undefined;

export { interpolateHeatIndex };
