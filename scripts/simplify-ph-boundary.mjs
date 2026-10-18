import { readFileSync, writeFileSync } from "node:fs";
import { simplify } from "@turf/simplify";

const raw = JSON.parse(readFileSync("public/geo/philippines.raw.geojson", "utf8"));
const simplified = simplify(raw, { tolerance: 0.02, highQuality: false, mutate: false });
writeFileSync("public/geo/philippines.geojson", JSON.stringify(simplified));
console.log(`wrote ${Buffer.byteLength(JSON.stringify(simplified))} bytes`);
