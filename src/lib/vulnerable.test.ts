import { describe, expect, it } from "vitest";
import { classifyHeatIndex } from "./heatIndex";
import {
  classifyForGroups,
  heatShiftC,
  isVulnerableGroupId,
  MULTI_GROUP_SHIFT_C,
  SINGLE_GROUP_SHIFT_C,
  uniqueGroups,
} from "./vulnerable";

describe("vulnerable groups", () => {
  it("accepts only known group ids", () => {
    expect(isVulnerableGroupId("senior")).toBe(true);
    expect(isVulnerableGroupId("rider")).toBe(false);
  });

  it("dedupes and keeps a stable order", () => {
    expect(uniqueGroups(["outdoorWorker", "senior", "senior", "nope", "child"])).toEqual([
      "senior",
      "child",
      "outdoorWorker",
    ]);
  });

  it("shifts classification 3°C for one group and 5°C for two or more", () => {
    expect(heatShiftC([])).toBe(0);
    expect(heatShiftC(["senior"])).toBe(SINGLE_GROUP_SHIFT_C);
    expect(heatShiftC(["senior", "child"])).toBe(MULTI_GROUP_SHIFT_C);
  });

  it("treats Caution heat as Extreme Caution for seniors", () => {
    expect(classifyHeatIndex(30).id).toBe("caution");
    expect(classifyForGroups(30, ["senior"]).id).toBe("extremeCaution");
  });

  it("does not change the official category when no group is selected", () => {
    expect(classifyForGroups(30, []).id).toBe(classifyHeatIndex(30).id);
  });
});
