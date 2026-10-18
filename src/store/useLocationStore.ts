import { create } from "zustand";
import { locationStatusFromError } from "@/lib/geolocationStatus";
import { METRO_MANILA_CENTER, type LatLng } from "@/lib/places";

export type LocationStatus = "idle" | "locating" | "granted" | "denied" | "unsupported" | "unavailable";

interface LocationState {
  /** Where the map should center. Defaults to Metro Manila. */
  center: LatLng;
  /** The user's actual position, when known. */
  userPosition: LatLng | null;
  status: LocationStatus;
  requestLocation: (options?: { centerMap?: boolean }) => void;
  setCenter: (center: LatLng) => void;
}

let requestSeq = 0;

export const useLocationStore = create<LocationState>((set, get) => ({
  center: METRO_MANILA_CENTER,
  userPosition: null,
  status: "idle",
  setCenter: (center) => set({ center }),
  requestLocation: (options) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      set({ status: "unsupported" });
      return;
    }
    const requestId = ++requestSeq;
    set({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (requestId !== requestSeq) return;
        const userPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        set((state) => ({
          userPosition,
          center: options?.centerMap ? userPosition : state.center,
          status: "granted",
        }));
      },
      (error) => {
        if (requestId !== requestSeq) return;
        set({
          status: locationStatusFromError({
            code: error.code,
            hasPosition: get().userPosition !== null,
          }),
        });
      },
      { enableHighAccuracy: false, timeout: 20_000, maximumAge: 5 * 60 * 1000 },
    );
  },
}));
