import { describe, expect, it } from "vitest";
import { locationStatusFromError } from "./geolocationStatus";

describe("locationStatusFromError", () => {
  it("marks only permission denial as denied", () => {
    expect(locationStatusFromError({ code: 1, hasPosition: false })).toBe("denied");
    expect(locationStatusFromError({ code: 1, hasPosition: true })).toBe("denied");
  });

  it("keeps a known fix when GPS times out or is briefly unavailable", () => {
    expect(locationStatusFromError({ code: 2, hasPosition: true })).toBe("granted");
    expect(locationStatusFromError({ code: 3, hasPosition: true })).toBe("granted");
  });

  it("does not claim location is off on a timeout without a fix", () => {
    expect(locationStatusFromError({ code: 2, hasPosition: false })).toBe("unavailable");
    expect(locationStatusFromError({ code: 3, hasPosition: false })).toBe("unavailable");
  });
});
