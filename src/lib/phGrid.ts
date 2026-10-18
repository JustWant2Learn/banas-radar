import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { LatLng } from "./places";

export const PH_LAT_MIN = 4.5;
export const PH_LAT_MAX = 21.5;
export const PH_LON_MIN = 116;
export const PH_LON_MAX = 127;
export const PH_GRID_STEP = 0.5;
export const PH_BBOX: [number, number, number, number] = [PH_LON_MIN, PH_LAT_MIN, PH_LON_MAX, PH_LAT_MAX];

export type LandGeometry = Feature<Polygon | MultiPolygon> | FeatureCollection<Polygon | MultiPolygon>;

export function generatePhGrid(step = PH_GRID_STEP): LatLng[] {
  const points: LatLng[] = [];
  for (let lat = PH_LAT_MIN; lat <= PH_LAT_MAX + 1e-9; lat += step) {
    for (let lon = PH_LON_MIN; lon <= PH_LON_MAX + 1e-9; lon += step) {
      points.push({ lat: roundCoord(lat), lon: roundCoord(lon) });
    }
  }
  return points;
}

export function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isOnLand(coord: LatLng, land: LandGeometry): boolean {
  const pt = point([coord.lon, coord.lat]);
  if (land.type === "FeatureCollection") {
    return land.features.some((feature) => booleanPointInPolygon(pt, feature));
  }
  return booleanPointInPolygon(pt, land);
}

/** Keep land points plus the 0.5° coastal ring so islands are not clipped too tightly. */
export function keepLandOrNear(points: readonly LatLng[], land: LandGeometry): LatLng[] {
  const landSet = new Set<string>();
  const landPoints: LatLng[] = [];
  for (const p of points) {
    if (isOnLand(p, land)) {
      landSet.add(keyOf(p));
      landPoints.push(p);
    }
  }
  return points.filter((p) => {
    if (landSet.has(keyOf(p))) return true;
    return landPoints.some(
      (landPoint) => Math.abs(landPoint.lat - p.lat) <= PH_GRID_STEP && Math.abs(landPoint.lon - p.lon) <= PH_GRID_STEP,
    );
  });
}

export async function loadPhilippinesBoundary(): Promise<FeatureCollection<Polygon | MultiPolygon>> {
  const file = path.join(process.cwd(), "public", "geo", "philippines.geojson");
  const raw: unknown = JSON.parse(await readFile(file, "utf8"));
  if (!isPolygonCollection(raw)) {
    throw new Error("philippines.geojson is not a polygon FeatureCollection");
  }
  return raw;
}

function isPolygonCollection(value: unknown): value is FeatureCollection<Polygon | MultiPolygon> {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown; features?: unknown };
  return v.type === "FeatureCollection" && Array.isArray(v.features);
}

function keyOf(point: LatLng): string {
  return `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
}
