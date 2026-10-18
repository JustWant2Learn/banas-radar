import { describe, expect, it } from "vitest";
import { polygon } from "@turf/helpers";
import { interiorPoint } from "./landPoint";

describe("interiorPoint", () => {
  it("places the sample point inside a land polygon, not at a watery centroid", () => {
    // C-shaped coastal polygon whose centroid sits in the hole (water).
    const land = polygon([
      [
        [120, 14],
        [122, 14],
        [122, 16],
        [120, 16],
        [120, 15.2],
        [121.6, 15.2],
        [121.6, 14.8],
        [120, 14.8],
        [120, 14],
      ],
    ]);
    const sample = interiorPoint(land);
    expect(sample.inWater).toBe(false);
    expect(sample.lon).toBeGreaterThan(120);
    expect(sample.lon).toBeLessThan(122);
  });
});
