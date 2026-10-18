import { describe, expect, it } from "vitest";
import { heatFillColor, heatRadiusMeters, mixHex } from "./heatColor";

describe("mixHex", () => {
  it("returns the start colour at 0 and the end colour at 1", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });
});

describe("heatFillColor", () => {
  it("uses the PAGASA stop colours at the bucket edges", () => {
    expect(heatFillColor(27)).toBe("#facc15");
    expect(heatFillColor(33)).toBe("#f97316");
    expect(heatFillColor(42)).toBe("#dc2626");
    expect(heatFillColor(52)).toBe("#7e1d7e");
  });

  it("shifts toward red as the heat index climbs through extreme caution", () => {
    const cooler = heatFillColor(34);
    const hotter = heatFillColor(40);
    expect(cooler).not.toBe(hotter);
    expect(hotter.startsWith("#")).toBe(true);
  });
});

describe("heatRadiusMeters", () => {
  it("grows as the map zooms out", () => {
    expect(heatRadiusMeters(13)).toBeLessThan(heatRadiusMeters(9));
    expect(heatRadiusMeters(15)).toBeLessThan(heatRadiusMeters(13));
  });
});
