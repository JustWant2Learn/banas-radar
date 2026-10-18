import { featureCollection, polygon } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import { generatePhGrid, isOnLand, keepLandOrNear, PH_GRID_STEP, PH_LAT_MAX, PH_LAT_MIN } from "./phGrid";

const square = featureCollection([
  polygon([
    [
      [120, 14],
      [121, 14],
      [121, 15],
      [120, 15],
      [120, 14],
    ],
  ]),
]);

describe("generatePhGrid", () => {
  it("covers the Philippines bounding box at 0.5°", () => {
    const grid = generatePhGrid();
    const lats = new Set(grid.map((p) => p.lat));
    expect(lats.has(PH_LAT_MIN)).toBe(true);
    expect(lats.has(PH_LAT_MAX)).toBe(true);
    expect(grid.length).toBeGreaterThan(700);
    expect(grid.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))).toBe(true);
  });
});

describe("land filter", () => {
  it("keeps interior points and a coastal ring", () => {
    const points = generatePhGrid(PH_GRID_STEP).filter((p) => p.lat >= 13 && p.lat <= 16 && p.lon >= 119 && p.lon <= 122);
    const kept = keepLandOrNear(points, square);
    expect(isOnLand({ lat: 14.5, lon: 120.5 }, square)).toBe(true);
    expect(kept.some((p) => p.lat === 14.5 && p.lon === 120.5)).toBe(true);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(points.length);
  });
});
