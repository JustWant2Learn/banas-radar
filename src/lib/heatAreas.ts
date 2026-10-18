import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadAreaCatalog } from "./areaCatalog";
import { assembleHeatAreas, logParentSamplePoints, type CitySample } from "./heatAggregate";
import { classifyHeatIndex, heatIndexCelsius } from "./heatIndex";
import {
  isAreaReading,
  isHeatAreasPayload,
  type AreaMeta,
  type AreaReading,
  type HeatAreasPayload,
} from "./heatAreasTypes";
import { fetchCurrentForPoints } from "./openMeteo";
import { getSupabaseAdmin } from "./supabaseAdmin";

const FILE_CACHE = path.join(process.cwd(), ".next", "cache", "heat-areas-v2.json");
const SAMPLE_CACHE = path.join(process.cwd(), ".next", "cache", "heat-city-samples.json");
const SAMPLE_TTL_MS = 70 * 60 * 1000;

let memoryPayload: HeatAreasPayload | null = null;
let inflight: Promise<HeatAreasPayload> | null = null;

export async function getLatestHeatAreas(): Promise<HeatAreasPayload | null> {
  if (memoryPayload) return memoryPayload;
  const fromFile = await readFileCache();
  if (fromFile) {
    memoryPayload = fromFile;
    return fromFile;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: latestRows, error: latestError } = await admin
    .from("heat_readings")
    .select("recorded_at")
    .not("recorded_at", "is", null)
    .order("recorded_at", { ascending: false })
    .limit(1);
  if (latestError || !latestRows || latestRows.length === 0) return null;
  const recordedAt = latestRows[0]?.recorded_at;
  if (typeof recordedAt !== "string") return null;

  const { data, error } = await admin.from("heat_readings").select("*").eq("recorded_at", recordedAt);
  if (error || !data || data.length === 0) return null;
  const payload = rowsToPayload(data, recordedAt);
  if (payload) {
    memoryPayload = payload;
    await writeFileCache(payload);
  }
  return payload;
}

export async function refreshHeatAreas(): Promise<HeatAreasPayload> {
  if (inflight) return inflight;
  inflight = buildHeatAreas().finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function isMostlyComplete(payload: HeatAreasPayload): Promise<boolean> {
  const catalog = await loadAreaCatalog();
  const needed = catalog.filter((area) => area.level === "city").length;
  const have = Object.values(payload.areas).filter((area) => area.level === "city").length;
  return needed === 0 || have >= needed - 10;
}

async function buildHeatAreas(): Promise<HeatAreasPayload> {
  const catalog = await loadAreaCatalog();
  logParentSamplePoints(catalog);

  const cities = catalog.filter((area) => area.level === "city");
  const citySamples = await collectCitySamples(cities);
  const recordedAt = citySamples.recordedAt;
  const payload = assembleHeatAreas(catalog, citySamples.samples, recordedAt);

  memoryPayload = payload;
  await writeFileCache(payload);
  try {
    await persistReadings(Object.values(payload.areas));
  } catch (error) {
    console.warn("[heat] Supabase persist failed; serving the in-memory batch anyway.", error);
  }
  return payload;
}

async function persistReadings(readings: readonly AreaReading[]): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const rows = readings.map((reading) => ({
    psgc_code: reading.psgc,
    level: reading.level,
    name: reading.name,
    parent_psgc: reading.parentPsgc,
    lat: reading.lat,
    lon: reading.lon,
    population: reading.population,
    temperature_c: reading.temperatureC,
    humidity: reading.humidity,
    heat_index_c: reading.heatIndexC,
    majority_category: reading.majorityCategory,
    hottest_psgc: reading.hottestPsgc,
    hottest_name: reading.hottestName,
    hottest_heat_index_c: reading.hottestHeatIndexC,
    recorded_at: reading.recordedAt,
    observed_at: reading.observedAt,
    updated_at: new Date().toISOString(),
  }));

  const chunk = 400;
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await admin.from("heat_readings").upsert(rows.slice(i, i + chunk), {
      onConflict: "psgc_code",
    });
    if (error) throw error;
  }
}

function rowsToPayload(rows: Record<string, unknown>[], recordedAt: string): HeatAreasPayload | null {
  const areas: Record<string, AreaReading> = {};
  for (const row of rows) {
    const reading = rowToReading(row, recordedAt);
    if (!reading) continue;
    areas[reading.psgc] = reading;
  }
  const values = Object.values(areas);
  if (values.length === 0) return null;
  return {
    generatedAt: recordedAt,
    recordedAt,
    areas,
    hottest: pickExtremum(values, "high"),
    coolest: pickExtremum(values, "low"),
  };
}

function pickExtremum(values: readonly AreaReading[], kind: "high" | "low"): AreaReading {
  const cities = values.filter((value) => value.level === "city");
  const pool = cities.length > 0 ? cities : values;
  return pool.reduce((best, next) => {
    if (kind === "high") return next.heatIndexC >= best.heatIndexC ? next : best;
    return next.heatIndexC <= best.heatIndexC ? next : best;
  });
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rowToReading(row: Record<string, unknown>, recordedAt: string): AreaReading | null {
  const lat = asNumber(row.lat);
  const lon = asNumber(row.lon);
  const temperatureC = asNumber(row.temperature_c);
  const humidity = asNumber(row.humidity);
  const heatIndexC = asNumber(row.heat_index_c);
  const hottestHeatIndexC = asNumber(row.hottest_heat_index_c);
  const population = asNumber(row.population);
  const batchTime = typeof row.recorded_at === "string" ? row.recorded_at : recordedAt;
  const reading = {
    psgc: typeof row.psgc_code === "string" ? row.psgc_code : "",
    level: row.level,
    name: typeof row.name === "string" ? row.name : "",
    parentPsgc: typeof row.parent_psgc === "string" ? row.parent_psgc : null,
    lat: lat ?? 0,
    lon: lon ?? 0,
    population,
    temperatureC: temperatureC ?? 0,
    humidity: humidity ?? 0,
    heatIndexC: heatIndexC ?? 0,
    majorityCategory: row.majority_category,
    hottestPsgc: typeof row.hottest_psgc === "string" ? row.hottest_psgc : "",
    hottestName: typeof row.hottest_name === "string" ? row.hottest_name : "",
    hottestHeatIndexC: hottestHeatIndexC ?? heatIndexC ?? 0,
    recordedAt: batchTime,
    observedAt: typeof row.observed_at === "string" ? row.observed_at : batchTime,
  };
  return isAreaReading(reading) ? reading : null;
}

interface CachedCitySample {
  psgc: string;
  temperatureC: number;
  humidity: number;
  heatIndexC: number;
}

interface CitySampleCache {
  recordedAt: string;
  samples: CachedCitySample[];
}

async function collectCitySamples(cities: readonly AreaMeta[]): Promise<{
  recordedAt: string;
  samples: CitySample[];
}> {
  const byPsgc = new Map(cities.map((city) => [city.psgc, city]));
  const cache = await readSampleCache();
  const collected = new Map<string, CitySample>();
  if (cache) {
    for (const item of cache.samples) {
      const meta = byPsgc.get(item.psgc);
      if (!meta) continue;
      collected.set(item.psgc, {
        meta,
        temperatureC: item.temperatureC,
        humidity: item.humidity,
        heatIndexC: item.heatIndexC,
      });
    }
  }

  const pending = cities.filter((city) => !collected.has(city.psgc));
  if (pending.length > 0) {
    const samples = await fetchCurrentForPoints(pending, { allowPartial: true });
    const count = Math.min(pending.length, samples.length);
    for (let i = 0; i < count; i++) {
      const meta = pending[i];
      const sample = samples[i];
      collected.set(meta.psgc, {
        meta,
        temperatureC: sample.temperatureC,
        humidity: sample.humidity,
        heatIndexC: heatIndexCelsius(sample.temperatureC, sample.humidity),
      });
    }
  }

  const recordedAt = cache?.recordedAt ?? new Date().toISOString();
  const samples = [...collected.values()];
  await writeSampleCache({
    recordedAt,
    samples: samples.map((sample) => ({
      psgc: sample.meta.psgc,
      temperatureC: sample.temperatureC,
      humidity: sample.humidity,
      heatIndexC: sample.heatIndexC,
    })),
  });
  console.info(`[heat] city samples ${samples.length}/${cities.length} recorded_at=${recordedAt}`);
  return { recordedAt, samples };
}

function isCitySampleCache(value: unknown): value is CitySampleCache {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.recordedAt === "string" && Array.isArray(v.samples);
}

async function readSampleCache(): Promise<CitySampleCache | null> {
  try {
    const raw: unknown = JSON.parse(await readFile(SAMPLE_CACHE, "utf8"));
    if (!isCitySampleCache(raw)) return null;
    const age = Date.now() - Date.parse(raw.recordedAt);
    if (!Number.isFinite(age) || age > SAMPLE_TTL_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

async function writeSampleCache(cache: CitySampleCache): Promise<void> {
  try {
    await mkdir(path.dirname(SAMPLE_CACHE), { recursive: true });
    await writeFile(SAMPLE_CACHE, JSON.stringify(cache));
  } catch {
    // Optional local cache.
  }
}

async function readFileCache(): Promise<HeatAreasPayload | null> {
  try {
    const raw: unknown = JSON.parse(await readFile(FILE_CACHE, "utf8"));
    return isHeatAreasPayload(raw) ? raw : null;
  } catch {
    return null;
  }
}

async function writeFileCache(payload: HeatAreasPayload): Promise<void> {
  try {
    await mkdir(path.dirname(FILE_CACHE), { recursive: true });
    await writeFile(FILE_CACHE, JSON.stringify(payload));
  } catch {
    // Optional local cache.
  }
}

export { classifyHeatIndex };
