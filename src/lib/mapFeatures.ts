import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { padPsgc, type AreaLevel } from "./psgc";

export interface DrawnArea {
  psgc: string;
  name: string;
  feature: Feature<Polygon | MultiPolygon>;
}

export const LEVEL_FILES: Record<AreaLevel, { url: string; psgcField: string; nameField: string }> = {
  region: { url: "/geo/regions.topo.json", psgcField: "adm1_psgc", nameField: "adm1_en" },
  province: { url: "/geo/provinces.topo.json", psgcField: "adm2_psgc", nameField: "adm2_en" },
  city: { url: "/geo/municities.topo.json", psgcField: "adm3_psgc", nameField: "adm3_en" },
};

export const PROVINCE_ZOOM = 2.3;
export const CITY_ZOOM = 5.4;

export interface MapFlyTo {
  lat: number;
  lon: number;
  level: AreaLevel;
  nonce: number;
}

export function scaleForLevel(level: AreaLevel): number {
  if (level === "city") return Math.max(CITY_ZOOM + 0.4, 6);
  if (level === "province") return PROVINCE_ZOOM + 0.75;
  return 1.45;
}

export function levelForScale(k: number): AreaLevel {
  if (k >= CITY_ZOOM) return "city";
  if (k >= PROVINCE_ZOOM) return "province";
  return "region";
}

export async function loadDrawnAreas(level: AreaLevel): Promise<DrawnArea[]> {
  const spec = LEVEL_FILES[level];
  const response = await fetch(spec.url);
  if (!response.ok) throw new Error(`Failed to load ${spec.url}`);
  const topo: unknown = await response.json();
  if (!isTopology(topo)) throw new Error(`${spec.url} is not TopoJSON`);
  const objectName = Object.keys(topo.objects)[0];
  const object = topo.objects[objectName];
  if (!isGeometryCollection(object)) throw new Error(`${spec.url} is missing a geometry collection`);
  const fc = feature(topo, object) as FeatureCollection<Polygon | MultiPolygon>;
  return fc.features.flatMap((feat) => toDrawnArea(feat, spec.psgcField, spec.nameField));
}

function toDrawnArea(
  feat: Feature<Polygon | MultiPolygon>,
  psgcField: string,
  nameField: string,
): DrawnArea[] {
  const props = asProps(feat.properties);
  const psgcRaw = props[psgcField];
  const nameRaw = props[nameField];
  if ((typeof psgcRaw !== "number" && typeof psgcRaw !== "string") || typeof nameRaw !== "string") {
    return [];
  }
  return [{ psgc: padPsgc(psgcRaw), name: nameRaw, feature: feat }];
}

function asProps(properties: GeoJsonProperties): Record<string, unknown> {
  return properties ?? {};
}

function isTopology(value: unknown): value is Topology {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "Topology";
}

function isGeometryCollection(value: unknown): value is GeometryCollection {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "GeometryCollection";
}
