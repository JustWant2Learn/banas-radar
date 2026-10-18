import { describe, expect, it } from "vitest";
import {
  buildOverpassQuery,
  classifyOsmTags,
  clampRadiusM,
  DEFAULT_COOLING_RADIUS_M,
  finalizeCoolingPlaces,
  parseCoolingKinds,
  toCoolingPlace,
  type CoolingPlace,
} from "./cooling";

describe("cooling kinds", () => {
  it("classifies OSM tags into malls, libraries, LGU halls, and water", () => {
    expect(classifyOsmTags({ shop: "mall" })).toBe("mall");
    expect(classifyOsmTags({ shop: "department_store" })).toBe("mall");
    expect(classifyOsmTags({ amenity: "library" })).toBe("library");
    expect(classifyOsmTags({ amenity: "townhall" })).toBe("lgu");
    expect(classifyOsmTags({ office: "government" })).toBe("lgu");
    expect(classifyOsmTags({ amenity: "community_centre" })).toBe("lgu");
    expect(classifyOsmTags({ shop: "water" })).toBe("water");
    expect(classifyOsmTags({ amenity: "drinking_water" })).toBe("water");
    expect(classifyOsmTags({ amenity: "cafe" })).toBeNull();
  });

  it("prefers water when a place is also tagged as a public building", () => {
    expect(classifyOsmTags({ amenity: "drinking_water", office: "government" })).toBe("water");
  });

  it("parses kind filters", () => {
    expect(parseCoolingKinds(null)).toBeNull();
    expect(parseCoolingKinds("all")).toBeNull();
    expect(parseCoolingKinds("mall,water,nope")).toEqual(["mall", "water"]);
  });

  it("clamps search radius", () => {
    expect(clampRadiusM(Number.NaN)).toBe(DEFAULT_COOLING_RADIUS_M);
    expect(clampRadiusM(200)).toBe(1_000);
    expect(clampRadiusM(80_000)).toBe(15_000);
  });
});

describe("cooling places", () => {
  it("builds a place from an OSM point and drops unknown tags", () => {
    const mall = toCoolingPlace(
      {
        id: "way/1",
        lat: 14.5547,
        lon: 121.0244,
        tags: { name: "Greenbelt", shop: "mall", opening_hours: "10:00-21:00" },
      },
      14.5547,
      121.0244,
    );
    expect(mall).toMatchObject({
      name: "Greenbelt",
      kind: "mall",
      distanceM: 0,
      openingHours: "10:00-21:00",
    });
    expect(toCoolingPlace({ id: "node/2", lat: 14.55, lon: 121.02, tags: { amenity: "bank" } }, 14.55, 121.02)).toBeNull();
  });

  it("sorts by distance, filters by kind, and drops near-duplicates", () => {
    const places: CoolingPlace[] = [
      place("mall/far", "SM Aura", "mall", 14.55, 121.05, 2_400),
      place("mall/near", "Greenbelt", "mall", 14.5547, 121.0244, 120),
      place("mall/dup", "Greenbelt", "mall", 14.5548, 121.0245, 140),
      place("water/1", "Refill", "water", 14.556, 121.03, 800),
    ];
    const result = finalizeCoolingPlaces(places, ["mall"], 6_000);
    expect(result.map((item) => item.id)).toEqual(["mall/near", "mall/far"]);
  });
});

describe("Overpass query", () => {
  it("searches the four cooling kinds around a point", () => {
    const query = buildOverpassQuery(14.5995, 120.9842, 6000);
    expect(query).toContain('shop"="mall"');
    expect(query).toContain('amenity"="library"');
    expect(query).toContain('amenity"="townhall"');
    expect(query).toContain('shop"="water"');
    expect(query).toContain("around:6000,14.59950,120.98420");
    expect(query).not.toContain('office"="government"');
  });
});

function place(
  id: string,
  name: string,
  kind: CoolingPlace["kind"],
  lat: number,
  lon: number,
  distanceM: number,
): CoolingPlace {
  return { id, name, kind, lat, lon, distanceM, address: null, openingHours: null };
}
