import { cachedFetch, type CacheHit } from "./cache";
import { buildReading, type HeatReading } from "./heatIndex";
import type { LatLng } from "./places";

/**
 * Open-Meteo client. Free, no API key.
 * Docs: https://open-meteo.com/en/docs
 */

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEZONE = "Asia/Manila";

export interface LocationHeat {
  lat: number;
  lon: number;
  current: HeatReading;
  /** Hourly readings for ~48h starting at the beginning of today (local time). */
  hourly: HeatReading[];
}

interface OpenMeteoLocationResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: Array<number | null>;
    relative_humidity_2m: Array<number | null>;
  };
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLocationResponse(value: unknown): value is OpenMeteoLocationResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const current = v.current as Record<string, unknown> | undefined;
  const hourly = v.hourly as Record<string, unknown> | undefined;
  return (
    isNumber(v.latitude) &&
    isNumber(v.longitude) &&
    current !== undefined &&
    typeof current.time === "string" &&
    isNumber(current.temperature_2m) &&
    isNumber(current.relative_humidity_2m) &&
    hourly !== undefined &&
    Array.isArray(hourly.time) &&
    Array.isArray(hourly.temperature_2m) &&
    Array.isArray(hourly.relative_humidity_2m)
  );
}

function toLocationHeat(res: OpenMeteoLocationResponse): LocationHeat {
  const hourly: HeatReading[] = [];
  for (let i = 0; i < res.hourly.time.length; i++) {
    const t = res.hourly.temperature_2m[i];
    const rh = res.hourly.relative_humidity_2m[i];
    if (isNumber(t) && isNumber(rh)) {
      hourly.push(buildReading(res.hourly.time[i], t, rh));
    }
  }
  return {
    lat: res.latitude,
    lon: res.longitude,
    current: buildReading(
      res.current.time,
      res.current.temperature_2m,
      res.current.relative_humidity_2m,
    ),
    hourly,
  };
}

function buildUrl(points: readonly LatLng[]): string {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(","),
    longitude: points.map((p) => p.lon.toFixed(4)).join(","),
    current: "temperature_2m,relative_humidity_2m",
    hourly: "temperature_2m,relative_humidity_2m",
    forecast_days: "2",
    timezone: TIMEZONE,
  });
  return `${BASE_URL}?${params.toString()}`;
}

async function fetchHeatRaw(points: readonly LatLng[]): Promise<LocationHeat[]> {
  const response = await fetch(buildUrl(points));
  if (!response.ok) {
    throw new Error(`Open-Meteo responded with ${response.status}`);
  }
  const json: unknown = await response.json();
  // Open-Meteo returns a single object for one location and an array for many.
  const list: unknown[] = Array.isArray(json) ? json : [json];
  return list.map((item) => {
    if (!isLocationResponse(item)) {
      throw new Error("Unexpected Open-Meteo response shape");
    }
    return toLocationHeat(item);
  });
}

function cacheKey(points: readonly LatLng[]): string {
  return `open-meteo:${points.map((p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`).join("|")}`;
}

/**
 * Fetch current + hourly heat data for one or many points in a single request.
 * Results are cached for 30 minutes; stale data is returned when offline.
 */
export function fetchHeatForPoints(points: readonly LatLng[]): Promise<CacheHit<LocationHeat[]>> {
  return cachedFetch(cacheKey(points), () => fetchHeatRaw(points));
}

export async function fetchHeatForPoint(point: LatLng): Promise<CacheHit<LocationHeat>> {
  const hit = await fetchHeatForPoints([point]);
  return { ...hit, value: hit.value[0] };
}

const GRID_BATCH = 50;

export interface CurrentSample {
  lat: number;
  lon: number;
  time: string;
  temperatureC: number;
  humidity: number;
}

interface FetchCurrentOptions {
  /** Return the samples collected so far instead of throwing on a 429. */
  allowPartial?: boolean;
}

/** Current-only fetch for centroids. No hourly series, no browser cache. */
export async function fetchCurrentForPoints(
  points: readonly LatLng[],
  options: FetchCurrentOptions = {},
): Promise<CurrentSample[]> {
  const samples: CurrentSample[] = [];
  for (let i = 0; i < points.length; i += GRID_BATCH) {
    const batch = points.slice(i, i + GRID_BATCH);
    const params = new URLSearchParams({
      latitude: batch.map((p) => p.lat.toFixed(4)).join(","),
      longitude: batch.map((p) => p.lon.toFixed(4)).join(","),
      current: "temperature_2m,relative_humidity_2m",
      timezone: TIMEZONE,
    });
    if (i > 0) await sleep(800);
    const response = await fetchOpenMeteo(`${BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      if (options.allowPartial && response.status === 429 && samples.length > 0) {
        return samples;
      }
      throw new Error(`Open-Meteo responded with ${response.status}`);
    }
    const json: unknown = await response.json();
    const list: unknown[] = Array.isArray(json) ? json : [json];
    if (list.length !== batch.length) {
      throw new Error(`Open-Meteo returned ${list.length} locations for a batch of ${batch.length}`);
    }
    for (let j = 0; j < list.length; j++) {
      const item = list[j];
      const requested = batch[j];
      if (!isCurrentOnlyResponse(item)) {
        throw new Error("Unexpected Open-Meteo current response shape");
      }
      samples.push({
        lat: requested.lat,
        lon: requested.lon,
        time: item.current.time,
        temperatureC: item.current.temperature_2m,
        humidity: item.current.relative_humidity_2m,
      });
    }
  }
  return samples;
}

interface OpenMeteoCurrentOnlyResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
  };
}

async function fetchOpenMeteo(url: string): Promise<Response> {
  const headers = { "User-Agent": "BanasRadar/0.1 (https://banasradar.app)" };
  let last: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    last = await fetch(url, { headers });
    if (last.status !== 429) return last;
    await sleep(8000 * 2 ** attempt);
  }
  return last ?? (await fetch(url, { headers }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCurrentOnlyResponse(value: unknown): value is OpenMeteoCurrentOnlyResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const current = v.current as Record<string, unknown> | undefined;
  return (
    isNumber(v.latitude) &&
    isNumber(v.longitude) &&
    current !== undefined &&
    typeof current.time === "string" &&
    isNumber(current.temperature_2m) &&
    isNumber(current.relative_humidity_2m)
  );
}
