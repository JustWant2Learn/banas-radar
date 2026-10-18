import { describe, expect, it } from "vitest";
import { FIRST_AID_CASE_IDS, FIRST_AID_URGENCY, matchFirstAid } from "./firstAid";

describe("first-aid cases", () => {
  it("covers at least five heat conditions", () => {
    expect(FIRST_AID_CASE_IDS.length).toBeGreaterThanOrEqual(5);
  });

  it("marks heat stroke as an emergency", () => {
    expect(FIRST_AID_URGENCY.heatStroke).toBe("emergency");
  });
});

describe("matchFirstAid", () => {
  it("returns no condition when nothing is ticked", () => {
    expect(matchFirstAid([]).primary).toBeNull();
    expect(matchFirstAid([]).emergency).toBe(false);
  });

  it("treats confusion or a seizure as heat stroke", () => {
    expect(matchFirstAid(["confused"]).primary).toBe("heatStroke");
    expect(matchFirstAid(["confused"]).emergency).toBe(true);
    expect(matchFirstAid(["seizure"]).primary).toBe("heatStroke");
    expect(matchFirstAid(["confused", "thirst", "rash"]).primary).toBe("heatStroke");
  });

  it("maps a single clear sign to its condition", () => {
    expect(matchFirstAid(["cramps"]).primary).toBe("heatCramps");
    expect(matchFirstAid(["thirst"]).primary).toBe("dehydration");
    expect(matchFirstAid(["rash"]).primary).toBe("heatRash");
    expect(matchFirstAid(["fainted"]).primary).toBe("heatSyncope");
    expect(matchFirstAid(["hotSkin"]).primary).toBe("heatStroke");
  });

  it("reads heavy sweat plus dizziness as heat exhaustion", () => {
    const match = matchFirstAid(["heavySweat", "dizzy", "nauseous"]);
    expect(match.primary).toBe("heatExhaustion");
    expect(match.emergency).toBe(false);
  });

  it("ignores unknown symptom ids", () => {
    expect(matchFirstAid(["not-a-sign"]).primary).toBeNull();
  });
});
