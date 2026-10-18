/** Earth radius in meters (mean). */
const EARTH_M = 6_371_000;

export function haversineMeters(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const φ1 = toRadians(fromLat);
  const φ2 = toRadians(toLat);
  const Δφ = toRadians(toLat - fromLat);
  const Δλ = toRadians(toLon - fromLon);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isFiniteCoordinate(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function walkingMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 80));
}

export function splitDistance(distanceM: number): { value: number; unit: "m" | "km" } {
  if (distanceM < 1000) return { value: Math.round(distanceM), unit: "m" };
  return { value: Math.round(distanceM / 100) / 10, unit: "km" };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
