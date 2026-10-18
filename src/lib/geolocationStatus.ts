export type ResolvedLocationStatus = "denied" | "granted" | "unavailable";

/** Browser `GeolocationPositionError.PERMISSION_DENIED`. */
export const GEO_PERMISSION_DENIED = 1;

/** Map a geolocation error without treating timeouts as “location is off”. */
export function locationStatusFromError(input: {
  code: number;
  hasPosition: boolean;
}): ResolvedLocationStatus {
  if (input.code === GEO_PERMISSION_DENIED) return "denied";
  if (input.hasPosition) return "granted";
  return "unavailable";
}
