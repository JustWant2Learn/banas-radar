/**
 * Rebuild public/geo/areas.json from the existing TopoJSON:
 * on-land sample points (polylabel / point-on-feature) + PSA 2020 population.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import polylabel from "@mapbox/polylabel";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { area as turfArea } from "@turf/area";
import { point, polygon } from "@turf/helpers";
import pointOnFeature from "@turf/point-on-feature";
import { feature } from "topojson-client";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "geo");
const POP_URL =
  "https://raw.githubusercontent.com/bendlikeabamboo/psgc-aux-data-repository/main/2026-04-13/psgc-aux-data.json";

function padPsgc(value) {
  return String(value).padStart(10, "0");
}

function roundCoord(value) {
  return Math.round(value * 10000) / 10000;
}

function topoFeatures(topo) {
  const name = Object.keys(topo.objects)[0];
  const fc = feature(topo, topo.objects[name]);
  return fc.type === "FeatureCollection" ? fc.features : [fc];
}

function largestRings(geom) {
  if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) return null;
  if (geom.type === "Polygon") return geom.coordinates;
  let best = null;
  let bestArea = -1;
  for (const coords of geom.coordinates) {
    if (!coords[0] || coords[0].length < 4) continue;
    const size = turfArea(polygon(coords));
    if (size > bestArea) {
      bestArea = size;
      best = coords;
    }
  }
  return best;
}

function interiorPoint(feat) {
  if (!feat.geometry) return null;
  const rings = largestRings(feat.geometry);
  let lon;
  let lat;
  if (rings && rings[0]?.length >= 4) {
    try {
      const labeled = polylabel(rings, 0.01);
      lon = labeled[0];
      lat = labeled[1];
    } catch {
      lon = undefined;
    }
  }
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    const rescued = pointOnFeature(feat);
    lon = rescued.geometry.coordinates[0];
    lat = rescued.geometry.coordinates[1];
  }
  let inWater = !booleanPointInPolygon(point([lon, lat]), feat);
  if (inWater) {
    const rescued = pointOnFeature(feat);
    lon = rescued.geometry.coordinates[0];
    lat = rescued.geometry.coordinates[1];
    inWater = !booleanPointInPolygon(point([lon, lat]), feat);
  }
  return { lat: roundCoord(lat), lon: roundCoord(lon), inWater };
}

function catalogFromFeatures(features, level, populationByPsgc) {
  const rows = [];
  const water = [];
  for (const feat of features) {
    const props = feat.properties ?? {};
    const psgcRaw = level === "region" ? props.adm1_psgc : level === "province" ? props.adm2_psgc : props.adm3_psgc;
    const nameRaw = level === "region" ? props.adm1_en : level === "province" ? props.adm2_en : props.adm3_en;
    if (psgcRaw == null || typeof nameRaw !== "string") continue;
    const psgc = padPsgc(psgcRaw);
    const sample = interiorPoint(feat);
    if (!sample) {
      console.warn(`[heat] SKIP ${level} ${psgc} ${nameRaw} (null geometry)`);
      continue;
    }
    if (sample.inWater) water.push({ level, psgc, name: nameRaw, lat: sample.lat, lon: sample.lon });
    rows.push({
      psgc,
      level,
      name: nameRaw,
      parentPsgc:
        level === "region" ? null : padPsgc(level === "province" ? props.adm1_psgc : props.adm2_psgc),
      lat: sample.lat,
      lon: sample.lon,
      population: populationByPsgc.get(psgc) ?? null,
      inWater: sample.inWater,
    });
  }
  return { rows, water };
}

function readPopulation(raw) {
  const official = new Map();
  const fromBarangay = new Map();
  if (!Array.isArray(raw)) return official;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const psgc = padPsgc(item.psgc_id ?? item.psgc_10digit ?? item.psgc ?? "");
    const population = Number(item.population ?? item.popu_2020 ?? item.population_2020);
    if (psgc.length !== 10 || !Number.isFinite(population) || population <= 0) continue;
    official.set(psgc, Math.round(population));
    if (!psgc.endsWith("000")) {
      const city = `${psgc.slice(0, 7)}000`;
      fromBarangay.set(city, (fromBarangay.get(city) ?? 0) + Math.round(population));
    }
  }
  for (const [psgc, population] of fromBarangay) {
    if (!official.has(psgc)) official.set(psgc, population);
  }
  return official;
}

async function loadPopulation() {
  try {
    const response = await fetch(POP_URL, { headers: { "User-Agent": "BanasRadar/0.1 (PSA population)" } });
    if (!response.ok) throw new Error(`population ${response.status}`);
    const json = await response.json();
    const map = readPopulation(json);
    console.log(`Loaded ${map.size} PSA population rows`);
    return map;
  } catch (error) {
    console.warn("PSA population download failed; averages will be unweighted.", error);
    return new Map();
  }
}

export async function enrichAreas() {
  const populationByPsgc = await loadPopulation();
  const specs = [
    ["regions.topo.json", "region"],
    ["provinces.topo.json", "province"],
    ["municities.topo.json", "city"],
  ];
  const catalog = [];
  const water = [];
  for (const [file, level] of specs) {
    const topo = JSON.parse(await readFile(path.join(OUT, file), "utf8"));
    const built = catalogFromFeatures(topoFeatures(topo), level, populationByPsgc);
    catalog.push(...built.rows);
    water.push(...built.water);
  }

  const citiesWithPop = catalog.filter((row) => row.level === "city" && row.population).length;
  await writeFile(path.join(OUT, "areas.json"), JSON.stringify({ areas: catalog }));
  console.log(
    `Wrote ${catalog.length} areas (${citiesWithPop} cities with PSA population).`,
  );
  for (const row of catalog.filter((item) => item.level !== "city")) {
    console.info(`[heat] ${row.level} ${row.psgc} ${row.name} ${row.lat},${row.lon} ${row.inWater ? "WATER" : "on-land"}`);
  }
  console.log(`[heat] on-land points: ${catalog.length - water.length}; water flags: ${water.length}`);
  return { catalog, water };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  enrichAreas().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
