export type AreaLevel = "region" | "province" | "city";

export function padPsgc(value: string | number): string {
  return String(value).padStart(10, "0");
}

export function isAreaLevel(value: unknown): value is AreaLevel {
  return value === "region" || value === "province" || value === "city";
}
