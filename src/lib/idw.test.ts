import { describe, expect, it } from "vitest";
import { interpolateHeatIndex, nearestGridPoint } from "./idw";
import type { HeatGridPoint } from "./heatSurfaceTypes";

function sample(lat: number, lon: number, heatIndexC: number): HeatGridPoint {
  return { lat, lon, temperatureC: 30, humidity: 60, heatIndexC, observedAt: "2026-04-15T12:00" };
}

describe("interpolateHeatIndex", () => {
  it("returns the exact value when the target sits on a sample", () => {
    const points = [sample(14.5, 121, 40), sample(15, 121, 30)];
    expect(interpolateHeatIndex(points, { lat: 14.5, lon: 121 })).toBe(40);
  });

  it("averages two equally distant samples", () => {
    const points = [sample(14, 120, 20), sample(16, 120, 40)];
    const mid = interpolateHeatIndex(points, { lat: 15, lon: 120 });
    expect(mid).not.toBeNull();
    expect(mid ?? 0).toBeCloseTo(30, 5);
  });

  it("returns null for an empty field", () => {
    expect(interpolateHeatIndex([], { lat: 14, lon: 121 })).toBeNull();
  });
});

describe("nearestGridPoint", () => {
  it("picks the closest sample", () => {
    const points = [sample(10, 120, 22), sample(14.6, 121, 38)];
    expect(nearestGridPoint(points, { lat: 14.5, lon: 121 })?.heatIndexC).toBe(38);
  });
});
