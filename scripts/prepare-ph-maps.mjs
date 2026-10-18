/**
 * Download faeldon/philippines-json-maps boundaries, merge each admin level,
 * simplify to TopoJSON, then write an on-land / population catalog.
 */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { feature } from "topojson-client";
import { enrichAreas } from "./enrich-areas.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = path.join(ROOT, "tmp", "ph-maps");
const OUT = path.join(ROOT, "public", "geo");
const RAW = "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master";
const API = "https://api.github.com/repos/faeldon/philippines-json-maps/contents";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "BanasRadar/0.1 (map prepare)" },
  });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

async function download(url, dest) {
  const response = await fetch(url, {
    headers: { "User-Agent": "BanasRadar/0.1 (map prepare)" },
  });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  await writeFile(dest, Buffer.from(await response.arrayBuffer()));
}

function topoFeatures(topo) {
  const name = Object.keys(topo.objects)[0];
  const fc = feature(topo, topo.objects[name]);
  return fc.type === "FeatureCollection" ? fc.features : [fc];
}

async function listDownloads(dir) {
  const entries = await fetchJson(`${API}/2023/topojson/${dir}/lowres`);
  return entries
    .filter((entry) => entry.type === "file" && entry.download_url)
    .map((entry) => ({ name: entry.name, url: entry.download_url }));
}

async function downloadAll(files, folder) {
  const destDir = path.join(TMP, folder);
  await mkdir(destDir, { recursive: true });
  const paths = [];
  for (const file of files) {
    const dest = path.join(destDir, file.name);
    process.stdout.write(`  ${file.name}\n`);
    await download(file.url, dest);
    paths.push(dest);
  }
  return paths;
}

function collectFeatures(paths) {
  const features = [];
  for (const file of paths) {
    const topo = JSON.parse(readFileSync(file, "utf8"));
    features.push(...topoFeatures(topo));
  }
  return features;
}

async function writeMergedTopo(features, idField, fields, dest, extraSimplify) {
  const geoPath = path.join(TMP, `${path.basename(dest, ".topo.json")}.src.json`);
  await writeFile(geoPath, JSON.stringify({ type: "FeatureCollection", features }));
  const args = [geoPath, "-filter-fields", fields];
  if (extraSimplify) args.push("-simplify", extraSimplify, "keep-shapes");
  args.push("-o", "format=topojson", `id-field=${idField}`, dest);
  const mapshaper = path.join(ROOT, "node_modules", "mapshaper", "bin", "mapshaper");
  await execFileAsync(process.execPath, [mapshaper, ...args], { cwd: ROOT, windowsHide: true });
}

async function main() {
  await mkdir(TMP, { recursive: true });
  await mkdir(OUT, { recursive: true });

  console.log("Downloading regions…");
  const regionsDest = path.join(TMP, "regions-source.topo.json");
  await download(`${RAW}/2023/topojson/country/lowres/country.topo.0.001.json`, regionsDest);
  const regionFeatures = topoFeatures(JSON.parse(await readFile(regionsDest, "utf8")));
  await writeMergedTopo(regionFeatures, "adm1_psgc", "adm1_psgc,adm1_en", path.join(OUT, "regions.topo.json"));

  console.log("Downloading provinces…");
  const provinceFiles = await listDownloads("regions");
  const provincePaths = await downloadAll(provinceFiles, "provinces");
  const provinceFeatures = collectFeatures(provincePaths);
  await writeMergedTopo(
    provinceFeatures,
    "adm2_psgc",
    "adm1_psgc,adm2_psgc,adm2_en",
    path.join(OUT, "provinces.topo.json"),
  );

  console.log("Downloading cities/municipalities…");
  const cityFiles = await listDownloads("provdists");
  const cityPaths = await downloadAll(cityFiles, "cities");
  const cityFeatures = collectFeatures(cityPaths);
  await writeMergedTopo(
    cityFeatures,
    "adm3_psgc",
    "adm1_psgc,adm2_psgc,adm3_psgc,adm3_en",
    path.join(OUT, "municities.topo.json"),
    "20%",
  );

  await enrichAreas();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
