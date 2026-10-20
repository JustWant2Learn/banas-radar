import { describe, expect, it } from "vitest";
import {
  buildReading,
  celsiusToFahrenheit,
  classifyHeatIndex,
  fahrenheitToCelsius,
  heatIndexCelsius,
  heatIndexFahrenheit,
  isDangerOrWorse,
  safestHours,
} from "./heatIndex";

describe("temperature conversion", () => {
  it("converts °C to °F and back", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(fahrenheitToCelsius(celsiusToFahrenheit(36.6))).toBeCloseTo(36.6, 10);
  });
});

describe("heatIndexFahrenheit (NWS Rothfusz)", () => {
  // The NWS chart is rounded and the regression has a stated error of ±1.3°F,
  // so reference values are checked to within 1.5°F.
  const NWS_TOLERANCE_F = 1.5;

  it.each([
    [90, 70, 105],
    [100, 50, 118],
    [86, 40, 85],
    [80, 40, 80],
  ])("matches the NWS reference table for %s°F / %s%% RH (≈%s°F)", (t, rh, expected) => {
    expect(Math.abs(heatIndexFahrenheit(t, rh) - expected)).toBeLessThanOrEqual(NWS_TOLERANCE_F);
  });

  it("uses the simple formula when conditions are mild", () => {
    // 70°F / 50% RH is well below the 80°F threshold.
    // simple = 0.5 * (70 + 61 + 2.4 + 4.7) = 69.05, averaged with T → 69.525
    const hi = heatIndexFahrenheit(70, 50);
    expect(hi).toBeLessThan(80);
    expect(hi).toBeCloseTo(69.525, 3);
  });

  it("applies the low-humidity adjustment", () => {
    const base = heatIndexFahrenheit(95, 13); // boundary: no adjustment
    const adjusted = heatIndexFahrenheit(95, 10); // RH < 13, adjustment applies
    // Lower humidity should produce a lower heat index, and the adjustment
    // should make the drop larger than the raw regression alone would give.
    expect(adjusted).toBeLessThan(base);
  });

  it("applies the high-humidity adjustment", () => {
    const withoutAdj = heatIndexFahrenheit(84, 85); // RH not > 85
    const withAdj = heatIndexFahrenheit(84, 95); // RH > 85 and 80 ≤ T ≤ 87
    expect(withAdj).toBeGreaterThan(withoutAdj);
  });

  it("clamps humidity to 0–100", () => {
    expect(heatIndexFahrenheit(90, 150)).toBe(heatIndexFahrenheit(90, 100));
    expect(heatIndexFahrenheit(90, -5)).toBe(heatIndexFahrenheit(90, 0));
  });
});

describe("heatIndexCelsius", () => {
  it("computes a typical Manila summer afternoon (34°C / 60% RH ≈ 42°C, Danger)", () => {
    const hi = heatIndexCelsius(34, 60);
    expect(hi).toBeGreaterThan(41.5);
    expect(hi).toBeLessThan(43);
    expect(classifyHeatIndex(hi).id).toBe("danger");
  });

  it("returns roughly the air temperature when it is cool", () => {
    expect(heatIndexCelsius(20, 50)).toBeCloseTo(20, 0);
  });
});

describe("classifyHeatIndex (PAGASA categories)", () => {
  it.each([
    [20, "safe"],
    [26.4, "safe"],
    [26.5, "caution"],
    [27, "caution"],
    [32, "caution"],
    [32.4, "caution"],
    [32.5, "extremeCaution"],
    [33, "extremeCaution"],
    [41, "extremeCaution"],
    [42, "danger"],
    [51, "danger"],
    [52, "extremeDanger"],
    [60, "extremeDanger"],
  ])("classifies %s°C as %s", (value, expected) => {
    expect(classifyHeatIndex(value).id).toBe(expected);
  });

  it("assigns the documented colours", () => {
    expect(classifyHeatIndex(30).color).toBe("#facc15");
    expect(classifyHeatIndex(35).color).toBe("#f97316");
    expect(classifyHeatIndex(45).color).toBe("#dc2626");
    expect(classifyHeatIndex(55).color).toBe("#7e1d7e");
  });

  it("flags danger and extreme danger as danger-or-worse", () => {
    expect(isDangerOrWorse(classifyHeatIndex(35))).toBe(false);
    expect(isDangerOrWorse(classifyHeatIndex(42))).toBe(true);
    expect(isDangerOrWorse(classifyHeatIndex(55))).toBe(true);
  });
});

describe("safestHours", () => {
  const day = "2026-04-15";
  const make = (hour: number, temp: number) =>
    buildReading(`${day}T${String(hour).padStart(2, "0")}:00`, temp, 60);

  it("returns the coolest daytime hours, lowest first", () => {
    const readings = [
      make(2, 25), // night — should be excluded
      make(7, 28),
      make(10, 32),
      make(13, 36),
      make(16, 34),
      make(18, 30),
    ];
    expect(safestHours(readings, 2)).toEqual([`${day}T07:00`, `${day}T18:00`]);
  });

  it("falls back to all readings when none are in daytime", () => {
    const readings = [make(1, 27), make(3, 25)];
    expect(safestHours(readings, 1)).toEqual([`${day}T03:00`]);
  });
});
