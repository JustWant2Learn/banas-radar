import { isAreaLevel, type AreaLevel } from "./psgc";
import type { HeatCategoryId } from "./heatIndex";

export interface AreaMeta {
  psgc: string;
  level: AreaLevel;
  name: string;
  parentPsgc: string | null;
  lat: number;
  lon: number;
  population: number | null;
  /** True when the catalog sample point sits outside the land polygon. */
  inWater?: boolean;
}

export interface AreaReading extends AreaMeta {
  temperatureC: number;
  humidity: number;
  /** Population-weighted (or simple) average heat index. */
  heatIndexC: number;
  majorityCategory: HeatCategoryId;
  hottestPsgc: string;
  hottestName: string;
  hottestHeatIndexC: number;
  /** Shared timestamp for every area in this refresh run. */
  recordedAt: string;
  observedAt: string;
}

export interface HeatAreasPayload {
  generatedAt: string;
  recordedAt: string;
  areas: Record<string, AreaReading>;
  hottest: AreaReading;
  coolest: AreaReading;
}

export function isHeatCategoryId(value: unknown): value is HeatCategoryId {
  return (
    value === "safe" ||
    value === "caution" ||
    value === "extremeCaution" ||
    value === "danger" ||
    value === "extremeDanger"
  );
}

export function isAreaMeta(value: unknown): value is AreaMeta {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const population = v.population;
  const inWater = v.inWater;
  return (
    typeof v.psgc === "string" &&
    isAreaLevel(v.level) &&
    typeof v.name === "string" &&
    (v.parentPsgc === null || typeof v.parentPsgc === "string") &&
    typeof v.lat === "number" &&
    typeof v.lon === "number" &&
    (population === undefined || population === null || (typeof population === "number" && Number.isFinite(population))) &&
    (inWater === undefined || typeof inWater === "boolean")
  );
}

export function normalizeAreaMeta(value: AreaMeta): AreaMeta {
  return {
    ...value,
    population: typeof value.population === "number" && value.population > 0 ? value.population : null,
    inWater: value.inWater === true,
  };
}

export function isAreaReading(value: unknown): value is AreaReading {
  if (!isAreaMeta(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.temperatureC === "number" &&
    typeof v.humidity === "number" &&
    typeof v.heatIndexC === "number" &&
    isHeatCategoryId(v.majorityCategory) &&
    typeof v.hottestPsgc === "string" &&
    typeof v.hottestName === "string" &&
    typeof v.hottestHeatIndexC === "number" &&
    typeof v.recordedAt === "string" &&
    typeof v.observedAt === "string"
  );
}

export function isHeatAreasPayload(value: unknown): value is HeatAreasPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.generatedAt === "string" &&
    typeof v.recordedAt === "string" &&
    typeof v.areas === "object" &&
    v.areas !== null &&
    isAreaReading(v.hottest) &&
    isAreaReading(v.coolest)
  );
}
