import type { HeatGridPoint } from "./heatSurfaceTypes";
import type { LatLng } from "./places";

const POWER = 2;
const NEIGHBORS = 8;

export function interpolateHeatIndex(points: readonly HeatGridPoint[], target: LatLng): number | null {
  if (points.length === 0) return null;

  const ranked = points
    .map((p) => ({ p, d2: squaredDistance(p, target) }))
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, NEIGHBORS);

  const exact = ranked.find((item) => item.d2 === 0);
  if (exact) return exact.p.heatIndexC;

  let num = 0;
  let den = 0;
  for (const item of ranked) {
    const w = 1 / Math.pow(item.d2, POWER / 2);
    num += w * item.p.heatIndexC;
    den += w;
  }
  if (den === 0) return ranked[0]?.p.heatIndexC ?? null;
  return num / den;
}

export function nearestGridPoint(points: readonly HeatGridPoint[], target: LatLng): HeatGridPoint | null {
  if (points.length === 0) return null;
  let best = points[0];
  let bestD = squaredDistance(best, target);
  for (let i = 1; i < points.length; i++) {
    const d = squaredDistance(points[i], target);
    if (d < bestD) {
      best = points[i];
      bestD = d;
    }
  }
  return best;
}

function squaredDistance(a: LatLng, b: LatLng): number {
  const dLat = a.lat - b.lat;
  const dLon = a.lon - b.lon;
  return dLat * dLat + dLon * dLon;
}
