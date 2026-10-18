import { Flame, Leaf, type LucideIcon, Siren, Sun, ThermometerSun } from "lucide-react";
import type { HeatCategoryId } from "@/lib/heatIndex";

/**
 * One icon per PAGASA category so danger is never communicated by colour alone.
 */
export const CATEGORY_ICONS: Record<HeatCategoryId, LucideIcon> = {
  safe: Leaf,
  caution: Sun,
  extremeCaution: ThermometerSun,
  danger: Flame,
  extremeDanger: Siren,
};
