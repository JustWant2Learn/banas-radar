import { haversineMeters, isFiniteCoordinate } from "./geo";

export const COOLING_KIND_IDS = ["mall", "library", "lgu", "water"] as const;

export type CoolingKind = (typeof COOLING_KIND_IDS)[number];

export interface CoolingPlace {
  id: string;
  name: string;
  kind: CoolingKind;
  lat: number;
  lon: number;
  distanceM: number;
  address: string | null;
  openingHours: string | null;
}

export type CoolingSource = "overpass" | "nominatim" | "seed";

export interface CoolingPayload {
  generatedAt: string;
  lat: number;
  lon: number;
  radiusM: number;
  attribution: string;
  source: CoolingSource;
  places: CoolingPlace[];
}

export const COOLING_ATTRIBUTION = "Map data © OpenStreetMap contributors";
export const DEFAULT_COOLING_RADIUS_M = 6_000;
export const MIN_COOLING_RADIUS_M = 1_000;
export const MAX_COOLING_RADIUS_M = 15_000;
export const MAX_COOLING_RESULTS = 60;

export function isCoolingKind(value: unknown): value is CoolingKind {
  return value === "mall" || value === "library" || value === "lgu" || value === "water";
}

export function parseCoolingKinds(raw: string | null): CoolingKind[] | null {
  if (!raw || raw.trim() === "" || raw === "all") return null;
  const kinds = raw
    .split(",")
    .map((part) => part.trim())
    .filter(isCoolingKind);
  return kinds.length > 0 ? kinds : null;
}

export function clampRadiusM(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_COOLING_RADIUS_M;
  return Math.min(MAX_COOLING_RADIUS_M, Math.max(MIN_COOLING_RADIUS_M, Math.round(value)));
}

export function classifyOsmTags(tags: Readonly<Record<string, string>>): CoolingKind | null {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const office = tags.office;
  const manMade = tags.man_made;

  if (amenity === "drinking_water" || amenity === "water_point" || shop === "water" || manMade === "water_tap") {
    return "water";
  }
  if (amenity === "library") return "library";
  if (shop === "mall" || shop === "department_store") return "mall";
  if (
    amenity === "townhall" ||
    amenity === "community_centre" ||
    amenity === "social_facility" ||
    amenity === "public_building" ||
    office === "government"
  ) {
    return "lgu";
  }
  return null;
}

export function fallbackCoolingName(kind: CoolingKind): string {
  if (kind === "mall") return "Shopping mall";
  if (kind === "library") return "Library";
  if (kind === "lgu") return "LGU / community hall";
  return "Water refill";
}

export function formatOsmAddress(tags: Readonly<Record<string, string>>): string | null {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:place"],
    tags["addr:suburb"] ?? tags["addr:barangay"],
    tags["addr:city"] ?? tags["addr:municipality"],
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  if (parts.length > 0) return parts.join(", ");
  const full = tags["addr:full"];
  return typeof full === "string" && full.trim().length > 0 ? full.trim() : null;
}

export interface OsmTaggedPoint {
  id: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export function toCoolingPlace(
  point: OsmTaggedPoint,
  originLat: number,
  originLon: number,
): CoolingPlace | null {
  if (!isFiniteCoordinate(point.lat, point.lon)) return null;
  const kind = classifyOsmTags(point.tags);
  if (!kind) return null;
  const name = point.tags.name?.trim() || fallbackCoolingName(kind);
  const openingHours = point.tags.opening_hours?.trim() || null;
  return {
    id: point.id,
    name,
    kind,
    lat: point.lat,
    lon: point.lon,
    distanceM: Math.round(haversineMeters(originLat, originLon, point.lat, point.lon)),
    address: formatOsmAddress(point.tags),
    openingHours,
  };
}

export function withOriginDistance(
  places: readonly CoolingPlace[],
  originLat: number,
  originLon: number,
): CoolingPlace[] {
  return places.map((place) => ({
    ...place,
    distanceM: Math.round(haversineMeters(originLat, originLon, place.lat, place.lon)),
  }));
}

export function finalizeCoolingPlaces(
  places: readonly CoolingPlace[],
  kinds: readonly CoolingKind[] | null,
  radiusM: number,
  origin?: { lat: number; lon: number },
): CoolingPlace[] {
  const located = origin ? withOriginDistance(places, origin.lat, origin.lon) : [...places];
  const allowed = kinds ? new Set(kinds) : null;
  const filtered = located.filter((place) => {
    if (place.distanceM > radiusM) return false;
    return allowed ? allowed.has(place.kind) : true;
  });
  return dedupeNearby(filtered)
    .slice()
    .sort((a, b) => a.distanceM - b.distanceM || a.name.localeCompare(b.name))
    .slice(0, MAX_COOLING_RESULTS);
}

function dedupeNearby(places: readonly CoolingPlace[]): CoolingPlace[] {
  const kept: CoolingPlace[] = [];
  for (const place of places) {
    const duplicate = kept.find(
      (other) =>
        other.kind === place.kind &&
        other.name === place.name &&
        haversineMeters(other.lat, other.lon, place.lat, place.lon) < 40,
    );
    if (!duplicate) kept.push(place);
  }
  return kept;
}

export function isCoolingPlace(value: unknown): value is CoolingPlace {
  if (typeof value !== "object" || value === null) return false;
  const place = value as Record<string, unknown>;
  return (
    typeof place.id === "string" &&
    typeof place.name === "string" &&
    isCoolingKind(place.kind) &&
    typeof place.lat === "number" &&
    typeof place.lon === "number" &&
    typeof place.distanceM === "number" &&
    (place.address === null || typeof place.address === "string") &&
    (place.openingHours === null || typeof place.openingHours === "string")
  );
}

export function isCoolingPayload(value: unknown): value is CoolingPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.generatedAt === "string" &&
    typeof payload.lat === "number" &&
    typeof payload.lon === "number" &&
    typeof payload.radiusM === "number" &&
    typeof payload.attribution === "string" &&
    isCoolingSource(payload.source) &&
    Array.isArray(payload.places) &&
    payload.places.every(isCoolingPlace)
  );
}

function isCoolingSource(value: unknown): value is CoolingSource {
  return value === "overpass" || value === "nominatim" || value === "seed";
}

export function directionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

export function buildOverpassQuery(lat: number, lon: number, radiusM: number): string {
  return buildOverpassKindQueries(lat, lon, radiusM)
    .map((part) => part.query)
    .join("\n");
}

export function buildOverpassKindQueries(
  lat: number,
  lon: number,
  radiusM: number,
): { kind: CoolingKind; query: string }[] {
  const around = `around:${radiusM},${lat.toFixed(5)},${lon.toFixed(5)}`;
  return [
    {
      kind: "mall",
      query: `[out:json][timeout:12];(way["shop"="mall"](${around});node["shop"="mall"](${around}););out center 25;`,
    },
    {
      kind: "library",
      query: `[out:json][timeout:12];nwr["amenity"="library"](${around});out center 20;`,
    },
    {
      kind: "lgu",
      query: `[out:json][timeout:12];(nwr["amenity"="townhall"](${around});nwr["amenity"="community_centre"](${around}););out center 20;`,
    },
    {
      kind: "water",
      query: `[out:json][timeout:12];(node["shop"="water"](${around});node["amenity"="drinking_water"](${around});node["amenity"="water_point"](${around}););out center 25;`,
    },
  ];
}
