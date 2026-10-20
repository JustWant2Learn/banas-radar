import { describe, expect, it } from "vitest";
import { isMostlyCompleteCounts } from "./heatAreas";

describe("isMostlyCompleteCounts", () => {
  it("treats a full city set as complete", () => {
    expect(isMostlyCompleteCounts(1716, 1716)).toBe(true);
  });

  it("allows a few missing cities", () => {
    expect(isMostlyCompleteCounts(1706, 1716)).toBe(true);
    expect(isMostlyCompleteCounts(1705, 1716)).toBe(false);
  });
});
