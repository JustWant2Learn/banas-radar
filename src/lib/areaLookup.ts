export function nearestArea<T extends { lat: number; lon: number }>(
  areas: readonly T[],
  lat: number,
  lon: number,
): T | null {
  if (areas.length === 0) return null;
  let best = areas[0];
  let bestD = (best.lat - lat) ** 2 + (best.lon - lon) ** 2;
  for (let i = 1; i < areas.length; i++) {
    const d = (areas[i].lat - lat) ** 2 + (areas[i].lon - lon) ** 2;
    if (d < bestD) {
      best = areas[i];
      bestD = d;
    }
  }
  return best;
}
