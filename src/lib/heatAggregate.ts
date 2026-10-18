import { classifyHeatIndex, type HeatCategoryId } from "./heatIndex";
import type { AreaMeta, AreaReading, HeatAreasPayload } from "./heatAreasTypes";

export interface CitySample {
  meta: AreaMeta;
  temperatureC: number;
  humidity: number;
  heatIndexC: number;
}

export function weightFor(area: Pick<AreaMeta, "population">): number {
  return area.population !== null && area.population > 0 ? area.population : 1;
}

export function weightedAverage(values: readonly { value: number; weight: number }[]): number {
  let sum = 0;
  let weight = 0;
  for (const item of values) {
    if (!Number.isFinite(item.value) || item.weight <= 0) continue;
    sum += item.value * item.weight;
    weight += item.weight;
  }
  return weight > 0 ? sum / weight : 0;
}

export function majorityCategory(children: readonly CitySample[]): HeatCategoryId {
  const totals = new Map<HeatCategoryId, number>();
  for (const child of children) {
    const id = classifyHeatIndex(child.heatIndexC).id;
    totals.set(id, (totals.get(id) ?? 0) + weightFor(child.meta));
  }
  let best: HeatCategoryId = "safe";
  let bestWeight = -1;
  for (const [id, weight] of totals) {
    if (weight > bestWeight) {
      best = id;
      bestWeight = weight;
    }
  }
  return best;
}

export function hottestChild(children: readonly CitySample[]): CitySample {
  return children.reduce((best, next) => (next.heatIndexC >= best.heatIndexC ? next : best));
}

export function aggregateParent(
  parent: AreaMeta,
  children: readonly CitySample[],
  recordedAt: string,
): AreaReading {
  if (children.length === 0) {
    throw new Error(`Cannot aggregate ${parent.psgc} without child samples`);
  }
  const usesPopulation = children.some((child) => child.meta.population !== null && child.meta.population > 0);
  const points = children.map((child) => ({
    value: child.heatIndexC,
    weight: usesPopulation ? weightFor(child.meta) : 1,
  }));
  const heatIndexC = weightedAverage(points);
  const temperatureC = weightedAverage(
    children.map((child) => ({
      value: child.temperatureC,
      weight: usesPopulation ? weightFor(child.meta) : 1,
    })),
  );
  const humidity = weightedAverage(
    children.map((child) => ({
      value: child.humidity,
      weight: usesPopulation ? weightFor(child.meta) : 1,
    })),
  );
  const hottest = hottestChild(children);
  const population = children.reduce((sum, child) => sum + (child.meta.population ?? 0), 0);
  return {
    ...parent,
    population: population > 0 ? population : parent.population,
    temperatureC,
    humidity,
    heatIndexC,
    majorityCategory: majorityCategory(children),
    hottestPsgc: hottest.meta.psgc,
    hottestName: hottest.meta.name,
    hottestHeatIndexC: hottest.heatIndexC,
    recordedAt,
    observedAt: recordedAt,
  };
}

export function cityReading(sample: CitySample, recordedAt: string): AreaReading {
  return {
    ...sample.meta,
    temperatureC: sample.temperatureC,
    humidity: sample.humidity,
    heatIndexC: sample.heatIndexC,
    majorityCategory: classifyHeatIndex(sample.heatIndexC).id,
    hottestPsgc: sample.meta.psgc,
    hottestName: sample.meta.name,
    hottestHeatIndexC: sample.heatIndexC,
    recordedAt,
    observedAt: recordedAt,
  };
}

export function groupByParent(samples: readonly CitySample[]): Map<string, CitySample[]> {
  const groups = new Map<string, CitySample[]>();
  for (const sample of samples) {
    const parent = sample.meta.parentPsgc;
    if (!parent) continue;
    const bucket = groups.get(parent) ?? [];
    bucket.push(sample);
    groups.set(parent, bucket);
  }
  return groups;
}

export function majorityFromReadings(children: readonly AreaReading[]): HeatCategoryId {
  const totals = new Map<HeatCategoryId, number>();
  for (const child of children) {
    const weight = child.population !== null && child.population > 0 ? child.population : 1;
    totals.set(child.majorityCategory, (totals.get(child.majorityCategory) ?? 0) + weight);
  }
  let best: HeatCategoryId = "safe";
  let bestWeight = -1;
  for (const [id, weight] of totals) {
    if (weight > bestWeight) {
      best = id;
      bestWeight = weight;
    }
  }
  return best;
}

export function aggregateFromReadings(
  parent: AreaMeta,
  children: readonly AreaReading[],
  recordedAt: string,
): AreaReading {
  if (children.length === 0) {
    throw new Error(`Cannot aggregate ${parent.psgc} without child samples`);
  }
  const usesPopulation = children.some((child) => child.population !== null && child.population > 0);
  const weightOf = (child: AreaReading) => (usesPopulation ? (child.population && child.population > 0 ? child.population : 0) : 1);
  const heatIndexC = weightedAverage(children.map((child) => ({ value: child.heatIndexC, weight: weightOf(child) })));
  const temperatureC = weightedAverage(
    children.map((child) => ({ value: child.temperatureC, weight: weightOf(child) })),
  );
  const humidity = weightedAverage(children.map((child) => ({ value: child.humidity, weight: weightOf(child) })));
  const hottest = children.reduce((best, next) =>
    next.hottestHeatIndexC >= best.hottestHeatIndexC ? next : best,
  );
  const population = children.reduce((sum, child) => sum + (child.population ?? 0), 0);
  return {
    ...parent,
    population: population > 0 ? population : parent.population,
    temperatureC,
    humidity,
    heatIndexC,
    majorityCategory: majorityFromReadings(children),
    hottestPsgc: hottest.hottestPsgc,
    hottestName: hottest.hottestName,
    hottestHeatIndexC: hottest.hottestHeatIndexC,
    recordedAt,
    observedAt: recordedAt,
  };
}

export function assembleHeatAreas(
  catalog: readonly AreaMeta[],
  citySamples: readonly CitySample[],
  recordedAt: string,
): HeatAreasPayload {
  const byPsgc = new Map(catalog.map((area) => [area.psgc, area]));
  const areas: Record<string, AreaReading> = {};

  for (const sample of citySamples) {
    areas[sample.meta.psgc] = cityReading(sample, recordedAt);
  }

  const byProvince = groupByParent(citySamples);
  const provinceReadings: AreaReading[] = [];
  for (const [psgc, children] of byProvince) {
    const parent = byPsgc.get(psgc);
    if (!parent || parent.level !== "province") continue;
    const reading = aggregateParent(parent, children, recordedAt);
    areas[psgc] = reading;
    provinceReadings.push(reading);
  }

  const byRegion = new Map<string, AreaReading[]>();
  for (const province of provinceReadings) {
    if (!province.parentPsgc) continue;
    const bucket = byRegion.get(province.parentPsgc) ?? [];
    bucket.push(province);
    byRegion.set(province.parentPsgc, bucket);
  }
  for (const [psgc, children] of byRegion) {
    const parent = byPsgc.get(psgc);
    if (!parent || parent.level !== "region") continue;
    areas[psgc] = aggregateFromReadings(parent, children, recordedAt);
  }

  const values = Object.values(areas);
  if (values.length === 0) {
    throw new Error("No heat readings returned for PSGC areas");
  }
  return {
    generatedAt: recordedAt,
    recordedAt,
    areas,
    hottest: pickExtremum(values, "high"),
    coolest: pickExtremum(values, "low"),
  };
}

function pickExtremum(values: readonly AreaReading[], kind: "high" | "low"): AreaReading {
  const cities = values.filter((value) => value.level === "city");
  const pool = cities.length > 0 ? cities : values;
  return pool.reduce((best, next) => {
    if (kind === "high") return next.heatIndexC >= best.heatIndexC ? next : best;
    return next.heatIndexC <= best.heatIndexC ? next : best;
  });
}

export function logParentSamplePoints(catalog: readonly AreaMeta[]): void {
  for (const area of catalog) {
    if (area.level === "city") continue;
    const flag = area.inWater ? "WATER" : "on-land";
    console.info(`[heat] ${area.level} ${area.psgc} ${area.name} ${area.lat},${area.lon} ${flag}`);
  }
}
