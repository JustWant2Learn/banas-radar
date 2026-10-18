import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { nearestArea } from "./areaLookup";
import { isAreaMeta, normalizeAreaMeta, type AreaMeta } from "./heatAreasTypes";

export { nearestArea };

let cached: AreaMeta[] | null = null;
let cachedMtime = 0;

export async function loadAreaCatalog(): Promise<AreaMeta[]> {
  const file = path.join(process.cwd(), "public", "geo", "areas.json");
  const mtime = (await stat(file)).mtimeMs;
  if (cached && cachedMtime === mtime) return cached;
  const raw: unknown = JSON.parse(await readFile(file, "utf8"));
  if (typeof raw !== "object" || raw === null || !("areas" in raw) || !Array.isArray(raw.areas)) {
    throw new Error("areas.json is missing an areas array");
  }
  const areas = raw.areas.filter(isAreaMeta).map(normalizeAreaMeta);
  if (areas.length === 0) throw new Error("areas.json has no valid areas");
  cached = areas;
  cachedMtime = mtime;
  return areas;
}

