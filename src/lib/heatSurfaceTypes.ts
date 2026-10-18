import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { HeatCategoryId } from "./heatIndex";

export interface HeatGridPoint {
  lat: number;
  lon: number;
  temperatureC: number;
  humidity: number;
  heatIndexC: number;
  observedAt: string;
}

export interface HeatExtremum {
  lat: number;
  lon: number;
  heatIndexC: number;
  name: string;
  region: string;
}

export interface HeatBandProperties {
  category: HeatCategoryId;
  color: string;
}

export interface HeatSurfacePayload {
  generatedAt: string;
  bands: FeatureCollection<Polygon | MultiPolygon, HeatBandProperties>;
  points: HeatGridPoint[];
  hottest: HeatExtremum;
  coolest: HeatExtremum;
}

export function isHeatSurfacePayload(value: unknown): value is HeatSurfacePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.generatedAt === "string" &&
    typeof v.bands === "object" &&
    v.bands !== null &&
    Array.isArray(v.points) &&
    typeof v.hottest === "object" &&
    v.hottest !== null &&
    typeof v.coolest === "object" &&
    v.coolest !== null
  );
}
