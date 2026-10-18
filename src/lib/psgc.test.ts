import { describe, expect, it } from "vitest";
import { nearestArea } from "./areaLookup";
import { levelForScale } from "./mapFeatures";
import { isAreaLevel, padPsgc } from "./psgc";

describe("padPsgc", () => {
  it("pads 9-digit regional codes to 10 digits", () => {
    expect(padPsgc(100000000)).toBe("0100000000");
    expect(padPsgc("1300000000")).toBe("1300000000");
  });
});

describe("isAreaLevel", () => {
  it("accepts the three choropleth levels", () => {
    expect(isAreaLevel("region")).toBe(true);
    expect(isAreaLevel("barangay")).toBe(false);
  });
});

describe("levelForScale", () => {
  it("switches from regions to provinces to cities", () => {
    expect(levelForScale(1)).toBe("region");
    expect(levelForScale(3)).toBe("province");
    expect(levelForScale(8)).toBe("city");
  });
});

describe("nearestArea", () => {
  it("returns the closest sample", () => {
    const areas = [
      { lat: 10, lon: 120, name: "south" },
      { lat: 14.6, lon: 121, name: "manila" },
    ];
    expect(nearestArea(areas, 14.5, 121)?.name).toBe("manila");
  });
});
