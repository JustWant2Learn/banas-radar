import { create } from "zustand";
import { classifyHeatIndex, getCategoryById, type HeatCategory } from "@/lib/heatIndex";
import { nearestArea } from "@/lib/areaLookup";
import { isHeatAreasPayload, type AreaReading, type HeatAreasPayload } from "@/lib/heatAreasTypes";
import { MAJOR_PLACES, type Place } from "@/lib/places";
import type { AreaLevel } from "@/lib/psgc";
import type { LocationHeat } from "@/lib/openMeteo";

export type HeatStatus = "idle" | "loading" | "ready" | "error";

export interface PlaceHeat {
  place: Place;
  heat: LocationHeat;
}

export interface SpotInspect {
  psgc: string;
  name: string;
  subtitle: AreaLevel;
  lat: number;
  lon: number;
  heatIndexC: number;
  temperatureC: number;
  humidity: number;
  category: HeatCategory;
  hottestName: string;
  hottestHeatIndexC: number;
}

interface HeatState {
  status: HeatStatus;
  byPlaceId: Record<string, PlaceHeat>;
  areas: HeatAreasPayload | null;
  updatedAt: number | null;
  isStale: boolean;
  error: string | null;
  selectedPlaceId: string | null;
  inspect: SpotInspect | null;
  loadMajorPlaces: () => Promise<void>;
  selectPlace: (id: string | null) => void;
  selectArea: (psgc: string) => void;
  clearInspect: () => void;
}

export const useHeatStore = create<HeatState>((set, get) => ({
  status: "idle",
  byPlaceId: {},
  areas: null,
  updatedAt: null,
  isStale: false,
  error: null,
  selectedPlaceId: null,
  inspect: null,
  selectPlace: (id) => set({ selectedPlaceId: id, inspect: null }),
  clearInspect: () => set({ inspect: null, selectedPlaceId: null }),
  selectArea: (psgc) => {
    const reading = get().areas?.areas[psgc];
    if (!reading) return;
    set({
      selectedPlaceId: null,
      inspect: toInspect(reading),
    });
  },
  loadMajorPlaces: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const response = await fetch("/api/heat/areas");
      if (!response.ok) {
        throw new Error(`Heat areas responded with ${response.status}`);
      }
      const json: unknown = await response.json();
      if (!isHeatAreasPayload(json)) {
        throw new Error("Unexpected heat areas shape");
      }

      const cityReadings = Object.values(json.areas).filter((area) => area.level === "city");
      const byPlaceId: Record<string, PlaceHeat> = {};
      for (const place of MAJOR_PLACES) {
        const nearest = nearestArea(cityReadings.length > 0 ? cityReadings : Object.values(json.areas), place.lat, place.lon);
        if (!nearest) continue;
        byPlaceId[place.id] = {
          place,
          heat: {
            lat: nearest.lat,
            lon: nearest.lon,
            current: {
              time: nearest.observedAt,
              temperatureC: nearest.temperatureC,
              humidity: nearest.humidity,
              heatIndexC: nearest.heatIndexC,
              category: classifyHeatIndex(nearest.heatIndexC),
            },
            hourly: [],
          },
        };
      }

      set({
        status: "ready",
        areas: json,
        byPlaceId,
        updatedAt: Date.parse(json.recordedAt),
        isStale: Date.now() - Date.parse(json.recordedAt) > 70 * 60 * 1000,
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
}));

function toInspect(reading: AreaReading): SpotInspect {
  return {
    psgc: reading.psgc,
    name: reading.name,
    subtitle: reading.level,
    lat: reading.lat,
    lon: reading.lon,
    heatIndexC: reading.heatIndexC,
    temperatureC: reading.temperatureC,
    humidity: reading.humidity,
    category: getCategoryById(reading.majorityCategory),
    hottestName: reading.hottestName,
    hottestHeatIndexC: reading.hottestHeatIndexC,
  };
}
