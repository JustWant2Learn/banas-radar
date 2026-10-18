import { featureCollection, polygon } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import { buildClippedBands } from "./heatSurface";
import type { HeatGridPoint } from "./heatSurfaceTypes";

function sample(lat: number, lon: number, heatIndexC: number): HeatGridPoint {
  return { lat, lon, temperatureC: 30, humidity: 70, heatIndexC, observedAt: "2026-04-15T12:00" };
}

describe("buildClippedBands", () => {
  it("returns land-clipped polygons with PAGASA categories", () => {
    const land = featureCollection([
      polygon([
        [
          [120, 14],
          [122, 14],
          [122, 16],
          [120, 16],
          [120, 14],
        ],
      ]),
    ]);
    const points = [
      sample(14.2, 120.2, 24),
      sample(14.2, 121.8, 30),
      sample(15.8, 120.2, 36),
      sample(15.8, 121.8, 44),
    ];
    const bands = buildClippedBands(points, land);
    expect(bands.features.length).toBeGreaterThan(0);
    expect(bands.features.every((f) => f.properties.color.startsWith("#"))).toBe(true);
    expect(bands.features.every((f) => typeof f.properties.category === "string")).toBe(true);
  });
});
