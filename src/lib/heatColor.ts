/**
 * Map-only colour helpers. Categories stay discrete (PAGASA buckets);
 * fills interpolate so neighbouring cities read as a weather surface.
 */

const STOPS: readonly { at: number; color: string }[] = [
  { at: 20, color: "#16a34a" },
  { at: 27, color: "#facc15" },
  { at: 33, color: "#f97316" },
  { at: 42, color: "#dc2626" },
  { at: 52, color: "#7e1d7e" },
];

function hexToRgb(hex: string): readonly [number, number, number] {
  const raw = hex.replace("#", "");
  const n = Number.parseInt(raw, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function mixHex(from: string, to: string, amount: number): string {
  const t = Math.min(1, Math.max(0, amount));
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

/** Continuous fill colour for a heat index in °C. */
export function heatFillColor(heatIndexC: number): string {
  const first = STOPS[0];
  const last = STOPS[STOPS.length - 1];
  if (heatIndexC <= first.at) return first.color;
  if (heatIndexC >= last.at) return last.color;

  for (let i = 1; i < STOPS.length; i++) {
    const prev = STOPS[i - 1];
    const next = STOPS[i];
    if (heatIndexC <= next.at) {
      return mixHex(prev.color, next.color, (heatIndexC - prev.at) / (next.at - prev.at));
    }
  }
  return last.color;
}

/** Soft wash radius so cities read as regions at the current zoom. */
export function heatRadiusMeters(zoom: number): number {
  if (zoom >= 15) return 2800;
  if (zoom >= 14) return 4200;
  if (zoom >= 13) return 6500;
  if (zoom >= 12) return 11000;
  if (zoom >= 11) return 18000;
  if (zoom >= 9) return 32000;
  if (zoom >= 7) return 60000;
  return 100000;
}
