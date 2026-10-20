/**
 * Heat index utilities.
 *
 * Pure functions only — no React, no browser APIs — so this file is easy to
 * unit test and safe to use on both server and client.
 *
 * Formula: NWS Rothfusz regression (https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml)
 * Categories: PAGASA heat index classification.
 */

export type HeatCategoryId =
  | "safe"
  | "caution"
  | "extremeCaution"
  | "danger"
  | "extremeDanger";

export interface HeatCategory {
  id: HeatCategoryId;
  /** Lower bound in °C (inclusive, on the rounded heat index). */
  min: number;
  /** Upper bound in °C (inclusive, on the rounded heat index). `null` = open-ended. */
  max: number | null;
  /** Hex colour used for map circles and badges. */
  color: string;
  /** Text colour that stays readable on top of `color`. */
  contrastText: string;
  /** Severity rank, 0 = safe. Useful for sorting and threshold checks. */
  rank: number;
}

export const HEAT_CATEGORIES: readonly HeatCategory[] = [
  { id: "safe", min: -Infinity, max: 26, color: "#16a34a", contrastText: "#ffffff", rank: 0 },
  { id: "caution", min: 27, max: 32, color: "#facc15", contrastText: "#1a1a1a", rank: 1 },
  { id: "extremeCaution", min: 33, max: 41, color: "#f97316", contrastText: "#1a1a1a", rank: 2 },
  { id: "danger", min: 42, max: 51, color: "#dc2626", contrastText: "#ffffff", rank: 3 },
  { id: "extremeDanger", min: 52, max: null, color: "#7e1d7e", contrastText: "#ffffff", rank: 4 },
] as const;

export const DANGER_RANK = 3;

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/**
 * Compute the heat index in °F from temperature (°F) and relative humidity (%).
 * Implements the NWS algorithm, including the simple-formula branch below
 * 80°F and the two standard low/high humidity adjustments.
 */
export function heatIndexFahrenheit(tempF: number, rh: number): number {
  const humidity = clamp(rh, 0, 100);

  // Simple formula (Steadman), averaged with the temperature.
  const simple = 0.5 * (tempF + 61.0 + (tempF - 68.0) * 1.2 + humidity * 0.094);
  const simpleAvg = (simple + tempF) / 2;
  if (simpleAvg < 80) return simpleAvg;

  // Full Rothfusz regression.
  const T = tempF;
  const R = humidity;
  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  // Adjustment 1: low humidity, 80–112°F.
  if (R < 13 && T >= 80 && T <= 112) {
    hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  }

  // Adjustment 2: high humidity, 80–87°F.
  if (R > 85 && T >= 80 && T <= 87) {
    hi += ((R - 85) / 10) * ((87 - T) / 5);
  }

  return hi;
}

/**
 * Compute the heat index in °C from temperature (°C) and relative humidity (%).
 */
export function heatIndexCelsius(tempC: number, rh: number): number {
  return fahrenheitToCelsius(heatIndexFahrenheit(celsiusToFahrenheit(tempC), rh));
}

/**
 * Classify a heat index (°C) into a PAGASA category.
 * The value is rounded to the nearest whole degree first, matching how
 * PAGASA publishes its daily heat index bulletin.
 */
export function classifyHeatIndex(heatIndexC: number): HeatCategory {
  const rounded = Math.round(heatIndexC);
  const match = HEAT_CATEGORIES.find(
    (c) => rounded >= c.min && (c.max === null || rounded <= c.max),
  );
  // HEAT_CATEGORIES is exhaustive from -Infinity upward, so match is always defined.
  return match ?? HEAT_CATEGORIES[0];
}

export function getCategoryById(id: HeatCategoryId): HeatCategory {
  const match = HEAT_CATEGORIES.find((c) => c.id === id);
  return match ?? HEAT_CATEGORIES[0];
}

export function isDangerOrWorse(category: HeatCategory): boolean {
  return category.rank >= DANGER_RANK;
}

export interface HeatReading {
  /** ISO timestamp from the data source. */
  time: string;
  temperatureC: number;
  humidity: number;
  heatIndexC: number;
  category: HeatCategory;
}

export function buildReading(time: string, temperatureC: number, humidity: number): HeatReading {
  const heatIndexC = heatIndexCelsius(temperatureC, humidity);
  return { time, temperatureC, humidity, heatIndexC, category: classifyHeatIndex(heatIndexC) };
}

/**
 * Pick the "safest" hours from a list of readings: lowest heat index first,
 * restricted to daytime hours (06:00–19:00 local) because that is when people
 * actually decide whether to go outside. Returns ISO times.
 */
export function safestHours(readings: readonly HeatReading[], count = 3): string[] {
  const daytime = readings.filter((r) => {
    const hour = new Date(r.time).getHours();
    return hour >= 6 && hour <= 19;
  });
  const pool = daytime.length > 0 ? daytime : [...readings];
  return pool
    .slice()
    .sort((a, b) => a.heatIndexC - b.heatIndexC)
    .slice(0, count)
    .map((r) => r.time);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
