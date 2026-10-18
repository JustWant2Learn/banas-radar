import type { AreaLevel } from "./psgc";

export interface SearchablePlace {
  psgc: string;
  name: string;
  level: AreaLevel;
}

const LEVEL_RANK: Record<AreaLevel, number> = {
  city: 0,
  province: 1,
  region: 2,
};

export function normalizePlaceQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function foldPlaceName(name: string): string {
  return normalizePlaceQuery(name)
    .replace(/^(city of|municipality of|municipality|city)\s+/, "")
    .replace(/\s+\([^)]*\)$/, "");
}

export function searchPlaces<T extends SearchablePlace>(
  places: readonly T[],
  query: string,
  limit = 8,
): T[] {
  const needle = normalizePlaceQuery(query);
  if (needle.length < 2) return [];

  const scored: { place: T; score: number }[] = [];
  for (const place of places) {
    const score = matchScore(place.name, needle);
    if (score === null) continue;
    scored.push({ place, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const levelDiff = LEVEL_RANK[a.place.level] - LEVEL_RANK[b.place.level];
    if (levelDiff !== 0) return levelDiff;
    return a.place.name.localeCompare(b.place.name);
  });

  return scored.slice(0, limit).map((item) => item.place);
}

function matchScore(name: string, needle: string): number | null {
  const full = normalizePlaceQuery(name);
  const folded = foldPlaceName(name);
  if (full === needle || folded === needle) return 0;
  if (full.startsWith(needle) || folded.startsWith(needle)) return 1;
  if (hasWordPrefix(full, needle) || hasWordPrefix(folded, needle)) return 2;
  if (full.includes(needle) || folded.includes(needle)) return 3;
  return null;
}

function hasWordPrefix(haystack: string, needle: string): boolean {
  return haystack.split(" ").some((word) => word.startsWith(needle));
}
