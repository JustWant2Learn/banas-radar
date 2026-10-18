import { describe, expect, it } from "vitest";
import { foldPlaceName, normalizePlaceQuery, searchPlaces, type SearchablePlace } from "./placeSearch";

const places: SearchablePlace[] = [
  { psgc: "c1", name: "Tuguegarao City", level: "city" },
  { psgc: "c2", name: "Cagayan de Oro", level: "city" },
  { psgc: "c3", name: "City of San Carlos", level: "city" },
  { psgc: "p1", name: "Cagayan", level: "province" },
  { psgc: "r1", name: "Region II (Cagayan Valley)", level: "region" },
  { psgc: "c4", name: "Quezon City", level: "city" },
];

describe("normalizePlaceQuery", () => {
  it("folds accents and extra punctuation", () => {
    expect(normalizePlaceQuery("  Parañaque  ")).toBe("paranaque");
    expect(normalizePlaceQuery("Cagayan-de-Oro")).toBe("cagayan-de-oro");
  });
});

describe("foldPlaceName", () => {
  it("drops City of prefixes so people can type the short name", () => {
    expect(foldPlaceName("City of San Carlos")).toBe("san carlos");
  });
});

describe("searchPlaces", () => {
  it("needs at least two characters", () => {
    expect(searchPlaces(places, "t")).toEqual([]);
  });

  it("ranks a city prefix ahead of a looser region match", () => {
    const hits = searchPlaces(places, "cagayan");
    expect(hits[0]?.psgc).toBe("p1");
    expect(hits.map((hit) => hit.psgc)).toContain("c2");
    expect(hits.map((hit) => hit.psgc)).toContain("r1");
  });

  it("finds Tuguegarao from a short prefix", () => {
    expect(searchPlaces(places, "tug")[0]?.name).toBe("Tuguegarao City");
  });

  it("matches San Carlos without requiring City of", () => {
    expect(searchPlaces(places, "san carlos")[0]?.psgc).toBe("c3");
  });
});
