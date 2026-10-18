import { describe, expect, it } from "vitest";
import {
  aggregateFromReadings,
  aggregateParent,
  assembleHeatAreas,
  majorityCategory,
  weightedAverage,
  type CitySample,
} from "./heatAggregate";

function city(psgc: string, heatIndexC: number, population: number | null, parentPsgc = "p"): CitySample {
  return {
    meta: {
      psgc,
      level: "city",
      name: psgc,
      parentPsgc,
      lat: 14,
      lon: 121,
      population,
    },
    temperatureC: heatIndexC,
    humidity: 60,
    heatIndexC,
  };
}

describe("heat aggregation", () => {
  it("uses a population-weighted average when census counts exist", () => {
    expect(
      weightedAverage([
        { value: 30, weight: 1 },
        { value: 40, weight: 3 },
      ]),
    ).toBe(37.5);
  });

  it("picks the category that covers the most people, not the average", () => {
    const children = [city("cool", 24, 1000), city("hot", 35, 9000)];
    expect(majorityCategory(children)).toBe("extremeCaution");
    const parent = aggregateParent(
      {
        psgc: "p",
        level: "province",
        name: "Province",
        parentPsgc: "r",
        lat: 14,
        lon: 121,
        population: null,
      },
      children,
      "2026-10-18T04:00:00.000Z",
    );
    expect(parent.majorityCategory).toBe("extremeCaution");
    expect(parent.heatIndexC).toBeCloseTo(33.9, 5);
    expect(parent.hottestName).toBe("hot");
    expect(parent.hottestHeatIndexC).toBe(35);
    expect(parent.recordedAt).toBe("2026-10-18T04:00:00.000Z");
  });

  it("falls back to a simple average when population is missing", () => {
    const parent = aggregateParent(
      {
        psgc: "p",
        level: "province",
        name: "Province",
        parentPsgc: "r",
        lat: 14,
        lon: 121,
        population: null,
      },
      [city("a", 20, null), city("b", 40, null)],
      "2026-10-18T04:00:00.000Z",
    );
    expect(parent.heatIndexC).toBe(30);
  });

  it("rolls a region from provinces with the same timestamp and hottest municipality", () => {
    const recordedAt = "2026-10-18T05:00:00.000Z";
    const cool = city("c1", 24, 1000, "p1");
    cool.meta.name = "Cool Town";
    const hot = city("c2", 40, 2000, "p2");
    hot.meta.name = "Hot Town";
    const payload = assembleHeatAreas(
      [
        {
          psgc: "r",
          level: "region",
          name: "Region",
          parentPsgc: null,
          lat: 16,
          lon: 121,
          population: null,
        },
        {
          psgc: "p1",
          level: "province",
          name: "North",
          parentPsgc: "r",
          lat: 16.2,
          lon: 121,
          population: null,
        },
        {
          psgc: "p2",
          level: "province",
          name: "South",
          parentPsgc: "r",
          lat: 15.8,
          lon: 121,
          population: null,
        },
        cool.meta,
        hot.meta,
      ],
      [cool, hot],
      recordedAt,
    );
    expect(payload.recordedAt).toBe(recordedAt);
    expect(payload.areas.p1.recordedAt).toBe(recordedAt);
    expect(payload.areas.p2.recordedAt).toBe(recordedAt);
    expect(payload.areas.r.recordedAt).toBe(recordedAt);
    expect(payload.areas.r.majorityCategory).toBe("extremeCaution");
    expect(payload.areas.r.hottestName).toBe("Hot Town");
    expect(payload.areas.r.hottestHeatIndexC).toBe(40);
    expect(payload.areas.r.heatIndexC).toBeCloseTo((24 * 1000 + 40 * 2000) / 3000, 5);
  });

  it("bubbles the hottest municipality when aggregating from province readings", () => {
    const recordedAt = "2026-10-18T05:00:00.000Z";
    const north = aggregateParent(
      {
        psgc: "p1",
        level: "province",
        name: "North",
        parentPsgc: "r",
        lat: 16,
        lon: 121,
        population: null,
      },
      [city("c1", 28, 4000)],
      recordedAt,
    );
    const south = aggregateParent(
      {
        psgc: "p2",
        level: "province",
        name: "South",
        parentPsgc: "r",
        lat: 15,
        lon: 121,
        population: null,
      },
      [city("c2", 36, 1000)],
      recordedAt,
    );
    south.hottestName = "Coastal";
    const region = aggregateFromReadings(
      {
        psgc: "r",
        level: "region",
        name: "Region",
        parentPsgc: null,
        lat: 16,
        lon: 121,
        population: null,
      },
      [north, south],
      recordedAt,
    );
    expect(region.hottestName).toBe("Coastal");
    expect(region.majorityCategory).toBe("caution");
    expect(region.recordedAt).toBe(recordedAt);
  });
});
