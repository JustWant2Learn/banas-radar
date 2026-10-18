import polylabel from "@mapbox/polylabel";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { area as turfArea } from "@turf/area";
import { point, polygon } from "@turf/helpers";
import pointOnFeature from "@turf/point-on-feature";
import type { Feature, MultiPolygon, Polygon } from "geojson";

export interface LandPoint {
  lat: number;
  lon: number;
  inWater: boolean;
}

export function interiorPoint(feature: Feature<Polygon | MultiPolygon>): LandPoint {
  const candidate = polylabelPoint(feature) ?? fallbackPoint(feature);
  const lon = roundCoord(candidate[0]);
  const lat = roundCoord(candidate[1]);
  const inWater = !booleanPointInPolygon(point([lon, lat]), feature);
  if (!inWater) return { lat, lon, inWater: false };

  const rescue = pointOnFeature(feature);
  const rescueLon = roundCoord(rescue.geometry.coordinates[0]);
  const rescueLat = roundCoord(rescue.geometry.coordinates[1]);
  return {
    lat: rescueLat,
    lon: rescueLon,
    inWater: !booleanPointInPolygon(point([rescueLon, rescueLat]), feature),
  };
}

function polylabelPoint(feature: Feature<Polygon | MultiPolygon>): [number, number] | null {
  const rings = largestPolygonRings(feature);
  if (!rings || rings[0].length < 4) return null;
  try {
    const result = polylabel(rings, 0.01);
    if (!Number.isFinite(result[0]) || !Number.isFinite(result[1])) return null;
    return result;
  } catch {
    return null;
  }
}

function fallbackPoint(feature: Feature<Polygon | MultiPolygon>): [number, number] {
  const rescued = pointOnFeature(feature);
  return [rescued.geometry.coordinates[0], rescued.geometry.coordinates[1]];
}

function largestPolygonRings(feature: Feature<Polygon | MultiPolygon>): number[][][] | null {
  if (feature.geometry.type === "Polygon") return feature.geometry.coordinates;
  let best: number[][][] | null = null;
  let bestArea = -1;
  for (const coords of feature.geometry.coordinates) {
    if (coords[0].length < 4) continue;
    const size = turfArea(polygon(coords));
    if (size > bestArea) {
      bestArea = size;
      best = coords;
    }
  }
  return best;
}

function roundCoord(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
