import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  COOLING_ATTRIBUTION,
  buildOverpassKindQueries,
  clampRadiusM,
  classifyOsmTags,
  fallbackCoolingName,
  finalizeCoolingPlaces,
  toCoolingPlace,
  type CoolingKind,
  type CoolingPlace,
  type CoolingPayload,
  type CoolingSource,
  type OsmTaggedPoint,
} from "./cooling";
import { seedCoolingPlaces } from "./coolingSeed";
import { haversineMeters, isFiniteCoordinate } from "./geo";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const CACHE_DIR = path.join(process.cwd(), ".next", "cache", "cooling");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = "BanasRadar/0.1 (https://banasradar; heat-safety PWA)";

const memory = new Map<string, { savedAt: number; payload: CoolingPayload }>();
const inflight = new Map<string, Promise<CoolingPayload>>();

export async function fetchCoolingPlaces(input: {
  lat: number;
  lon: number;
  radiusM: number;
  kinds: readonly CoolingKind[] | null;
}): Promise<CoolingPayload> {
  if (!isFiniteCoordinate(input.lat, input.lon)) {
    throw new Error("Invalid coordinates");
  }
  const radiusM = clampRadiusM(input.radiusM);
  const cacheKey = cellKey(input.lat, input.lon, radiusM);
  const cached = await readCache(cacheKey);
  if (cached && new Set(cached.places.map((place) => place.kind)).size > 1) {
    return {
      ...cached,
      lat: input.lat,
      lon: input.lon,
      radiusM,
      source: cached.source,
      places: finalizeCoolingPlaces(cached.places, input.kinds, radiusM, {
        lat: input.lat,
        lon: input.lon,
      }),
    };
  }

  const existing = inflight.get(cacheKey);
  if (existing) {
    const payload = await existing;
    return {
      ...payload,
      lat: input.lat,
      lon: input.lon,
      places: finalizeCoolingPlaces(payload.places, input.kinds, radiusM, {
        lat: input.lat,
        lon: input.lon,
      }),
    };
  }

  const request = loadFreshPlaces(input.lat, input.lon, radiusM)
    .then(async ({ places, source }) => {
      const payload: CoolingPayload = {
        generatedAt: new Date().toISOString(),
        lat: input.lat,
        lon: input.lon,
        radiusM,
        attribution: COOLING_ATTRIBUTION,
        source,
        places: finalizeCoolingPlaces(places, null, radiusM),
      };
      if (source !== "seed" && new Set(payload.places.map((place) => place.kind)).size > 1) {
        await writeCache(cacheKey, payload);
      }
      return payload;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, request);
  const payload = await request;
  return {
    ...payload,
    places: finalizeCoolingPlaces(payload.places, input.kinds, radiusM, {
      lat: input.lat,
      lon: input.lon,
    }),
  };
}

async function loadFreshPlaces(
  lat: number,
  lon: number,
  radiusM: number,
): Promise<{ places: CoolingPlace[]; source: CoolingSource }> {
  const overpassPoints = await queryOverpassSplit(lat, lon, radiusM);
  const overpassPlaces = overpassPoints
    .map((point) => toCoolingPlace(point, lat, lon))
    .filter((place): place is NonNullable<typeof place> => place !== null);

  const missing = missingKinds(overpassPlaces);
  const nominatimPlaces =
    missing.length > 0 ? await queryNominatim(lat, lon, radiusM, missing) : [];
  const combined = [...overpassPlaces, ...nominatimPlaces];
  const stillMissing = missingKinds(combined);
  const seeded = stillMissing.length > 0 ? seedCoolingPlaces(lat, lon, radiusM) : [];
  const places = [...combined, ...seeded.filter((place) => stillMissing.includes(place.kind))];

  if (places.length === 0) throw new Error("No cooling places found");

  const source: CoolingSource =
    overpassPlaces.length > 0 ? "overpass" : nominatimPlaces.length > 0 ? "nominatim" : "seed";
  return { places, source };
}

function missingKinds(places: readonly CoolingPlace[]): CoolingKind[] {
  const seen = new Set(places.map((place) => place.kind));
  return (["mall", "library", "lgu", "water"] as const).filter((kind) => !seen.has(kind));
}

async function queryOverpassSplit(lat: number, lon: number, radiusM: number): Promise<OsmTaggedPoint[]> {
  const batches = await Promise.all(
    buildOverpassKindQueries(lat, lon, radiusM).map((part) => queryOverpassOnce(part.query)),
  );
  return batches.flat();
}

async function queryOverpassOnce(query: string): Promise<OsmTaggedPoint[]> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(7_000),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const json: unknown = await response.json();
      if (!isHealthyOverpass(json)) continue;
      return parseOverpassElements(json);
    } catch {
      // Try the next mirror.
    }
  }
  return [];
}

async function queryNominatim(
  lat: number,
  lon: number,
  radiusM: number,
  kinds: readonly CoolingKind[],
): Promise<CoolingPlace[]> {
  const allSearches: { q: string; kind: CoolingKind }[] = [
    { q: "shopping mall", kind: "mall" },
    { q: "public library", kind: "library" },
    { q: "city hall", kind: "lgu" },
    { q: "water refill", kind: "water" },
  ];
  const searches = allSearches.filter((search) => kinds.includes(search.kind));
  const deltaLat = radiusM / 111_000;
  const deltaLon = radiusM / (111_000 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const viewbox = `${lon - deltaLon},${lat + deltaLat},${lon + deltaLon},${lat - deltaLat}`;
  const places: CoolingPlace[] = [];

  for (const [index, search] of searches.entries()) {
    if (index > 0) await wait(1100);
    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", search.q);
      url.searchParams.set("limit", "12");
      url.searchParams.set("viewbox", viewbox);
      url.searchParams.set("bounded", "1");
      url.searchParams.set("addressdetails", "1");
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const json: unknown = await response.json();
      if (!Array.isArray(json)) continue;
      for (const item of json) {
        const place = nominatimToPlace(item, search.kind, lat, lon);
        if (place && place.distanceM <= radiusM) places.push(place);
      }
    } catch {
      // Keep going; other searches or the seed list can still fill the page.
    }
  }
  return places;
}

function nominatimToPlace(
  value: unknown,
  fallbackKind: CoolingKind,
  originLat: number,
  originLon: number,
): CoolingPlace | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!isFiniteCoordinate(lat, lon)) return null;
  const osmType = typeof item.osm_type === "string" ? item.osm_type : "node";
  const osmId = typeof item.osm_id === "number" ? item.osm_id : Number(item.place_id);
  const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : fallbackCoolingName(fallbackKind);
  const tags: Record<string, string> = { name };
  if (item.class === "shop" && item.type === "mall") tags.shop = "mall";
  else if (item.type === "library") tags.amenity = "library";
  else if (item.type === "townhall" || item.type === "community_centre") tags.amenity = "townhall";
  else if (item.type === "drinking_water" || (item.class === "amenity" && item.type === "water")) tags.amenity = "drinking_water";
  else if (fallbackKind === "mall") tags.shop = "mall";
  else if (fallbackKind === "library") tags.amenity = "library";
  else if (fallbackKind === "lgu") tags.amenity = "townhall";
  else tags.shop = "water";

  const kind = classifyOsmTags(tags) ?? fallbackKind;
  const address = typeof item.display_name === "string" ? shortenNominatimAddress(item.display_name) : null;
  return {
    id: `${osmType}/${osmId}`,
    name,
    kind,
    lat,
    lon,
    distanceM: Math.round(haversineMeters(originLat, originLon, lat, lon)),
    address,
    openingHours: null,
  };
}

function shortenNominatimAddress(displayName: string): string {
  return displayName.split(",").slice(0, 3).map((part) => part.trim()).join(", ");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function isHealthyOverpass(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const osm3s = (value as { osm3s?: unknown }).osm3s;
  if (typeof osm3s !== "object" || osm3s === null) return true;
  const timestamp = (osm3s as { timestamp_osm_base?: unknown }).timestamp_osm_base;
  if (typeof timestamp !== "string") return true;
  return timestamp.includes("-") || timestamp.includes("T");
}

function parseOverpassElements(value: unknown): OsmTaggedPoint[] {
  if (typeof value !== "object" || value === null || !("elements" in value)) return [];
  const elements = (value as { elements: unknown }).elements;
  if (!Array.isArray(elements)) return [];

  const points: OsmTaggedPoint[] = [];
  for (const item of elements) {
    if (!isOverpassElement(item)) continue;
    const lat = item.lat ?? item.center?.lat;
    const lon = item.lon ?? item.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    points.push({
      id: `${item.type}/${item.id}`,
      lat,
      lon,
      tags: item.tags ?? {},
    });
  }
  return points;
}

function isOverpassElement(value: unknown): value is OverpassElement {
  if (typeof value !== "object" || value === null) return false;
  const element = value as Record<string, unknown>;
  if (typeof element.type !== "string" || typeof element.id !== "number") return false;
  if (element.tags !== undefined && (typeof element.tags !== "object" || element.tags === null)) {
    return false;
  }
  if (element.center !== undefined) {
    if (typeof element.center !== "object" || element.center === null) return false;
    const center = element.center as Record<string, unknown>;
    if (typeof center.lat !== "number" || typeof center.lon !== "number") return false;
  }
  return true;
}

function cellKey(lat: number, lon: number, radiusM: number): string {
  const cellLat = Math.round(lat * 50) / 50;
  const cellLon = Math.round(lon * 50) / 50;
  return `${cellLat.toFixed(2)}_${cellLon.toFixed(2)}_${radiusM}`;
}

async function readCache(key: string): Promise<CoolingPayload | null> {
  const memoryHit = memory.get(key);
  if (memoryHit && Date.now() - memoryHit.savedAt < CACHE_TTL_MS) {
    return memoryHit.payload;
  }
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isCachedEnvelope(parsed)) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    memory.set(key, { savedAt: parsed.savedAt, payload: parsed.payload });
    return parsed.payload;
  } catch {
    return null;
  }
}

async function writeCache(key: string, payload: CoolingPayload): Promise<void> {
  const savedAt = Date.now();
  memory.set(key, { savedAt, payload });
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const envelope: CachedEnvelope = { savedAt, payload };
    await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(envelope));
  } catch {
    // File cache is optional; memory still holds the result.
  }
}

interface CachedEnvelope {
  savedAt: number;
  payload: CoolingPayload;
}

function isCachedEnvelope(value: unknown): value is CachedEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const envelope = value as Record<string, unknown>;
  if (typeof envelope.savedAt !== "number") return false;
  if (typeof envelope.payload !== "object" || envelope.payload === null) return false;
  const payload = envelope.payload as Record<string, unknown>;
  if (!Array.isArray(payload.places)) return false;
  if (payload.source === undefined) payload.source = "overpass";
  return true;
}
