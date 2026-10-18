import { classifyHeatIndex, type HeatCategory, type HeatCategoryId } from "./heatIndex";

export const VULNERABLE_GROUP_IDS = ["senior", "child", "pregnant", "outdoorWorker"] as const;

export type VulnerableGroupId = (typeof VULNERABLE_GROUP_IDS)[number];

/** Extra °C applied to PAGASA classification for a personal risk reading. */
export const SINGLE_GROUP_SHIFT_C = 3;
export const MULTI_GROUP_SHIFT_C = 5;

export function isVulnerableGroupId(value: unknown): value is VulnerableGroupId {
  return (
    value === "senior" || value === "child" || value === "pregnant" || value === "outdoorWorker"
  );
}

export function uniqueGroups(values: readonly unknown[]): VulnerableGroupId[] {
  const seen = new Set<VulnerableGroupId>();
  for (const value of values) {
    if (isVulnerableGroupId(value)) seen.add(value);
  }
  return VULNERABLE_GROUP_IDS.filter((id) => seen.has(id));
}

export function heatShiftC(groups: readonly VulnerableGroupId[]): number {
  if (groups.length === 0) return 0;
  if (groups.length === 1) return SINGLE_GROUP_SHIFT_C;
  return MULTI_GROUP_SHIFT_C;
}

/**
 * Official PAGASA category stays on the map. This is the stricter category
 * we show to seniors, kids, pregnant users, and outdoor workers.
 */
export function classifyForGroups(
  heatIndexC: number,
  groups: readonly VulnerableGroupId[],
): HeatCategory {
  return classifyHeatIndex(heatIndexC + heatShiftC(groups));
}

export function personalCategoryDiffers(
  official: HeatCategoryId,
  personal: HeatCategoryId,
): boolean {
  return official !== personal;
}
