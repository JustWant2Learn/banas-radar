import { finalizeCoolingPlaces, type CoolingPlace } from "./cooling";

/** Last-resort well-known PH cooling spots used only when OSM is unreachable. */
const SEED_PLACES: readonly Omit<CoolingPlace, "distanceM">[] = [
  { id: "seed/greenbelt", name: "Greenbelt", kind: "mall", lat: 14.5516, lon: 121.0244, address: "Makati", openingHours: null },
  { id: "seed/sm-makati", name: "SM Makati", kind: "mall", lat: 14.5503, lon: 121.0276, address: "Makati", openingHours: null },
  { id: "seed/circuit", name: "Ayala Malls Circuit", kind: "mall", lat: 14.5758, lon: 121.0172, address: "Makati", openingHours: null },
  { id: "seed/moa", name: "SM Mall of Asia", kind: "mall", lat: 14.5352, lon: 120.9822, address: "Pasay", openingHours: null },
  { id: "seed/sm-aura", name: "SM Aura Premier", kind: "mall", lat: 14.5466, lon: 121.0543, address: "Taguig", openingHours: null },
  { id: "seed/bgc", name: "Market! Market!", kind: "mall", lat: 14.5495, lon: 121.0555, address: "Taguig", openingHours: null },
  { id: "seed/rob-manila", name: "Robinsons Manila", kind: "mall", lat: 14.5764, lon: 120.9839, address: "Manila", openingHours: null },
  { id: "seed/sm-north", name: "SM North EDSA", kind: "mall", lat: 14.6565, lon: 121.0307, address: "Quezon City", openingHours: null },
  { id: "seed/nlp", name: "National Library of the Philippines", kind: "library", lat: 14.5831, lon: 120.9806, address: "Ermita, Manila", openingHours: null },
  { id: "seed/qc-library", name: "Quezon City Public Library", kind: "library", lat: 14.6512, lon: 121.0488, address: "Quezon City", openingHours: null },
  { id: "seed/manila-hall", name: "Manila City Hall", kind: "lgu", lat: 14.5895, lon: 120.9814, address: "Manila", openingHours: null },
  { id: "seed/makati-hall", name: "Makati City Hall", kind: "lgu", lat: 14.554, lon: 121.0213, address: "Makati", openingHours: null },
  { id: "seed/qc-hall", name: "Quezon City Hall", kind: "lgu", lat: 14.6474, lon: 121.0493, address: "Quezon City", openingHours: null },
  { id: "seed/pasig-hall", name: "Pasig City Hall", kind: "lgu", lat: 14.5764, lon: 121.0851, address: "Pasig", openingHours: null },
  { id: "seed/ayala-cebu", name: "Ayala Center Cebu", kind: "mall", lat: 10.3178, lon: 123.9054, address: "Cebu City", openingHours: null },
  { id: "seed/sm-cebu", name: "SM City Cebu", kind: "mall", lat: 10.3116, lon: 123.9184, address: "Cebu City", openingHours: null },
  { id: "seed/sm-lanang", name: "SM Lanang Premier", kind: "mall", lat: 7.0982, lon: 125.6306, address: "Davao City", openingHours: null },
  { id: "seed/sm-baguio", name: "SM City Baguio", kind: "mall", lat: 16.4089, lon: 120.5994, address: "Baguio", openingHours: null },
  { id: "seed/sm-iloilo", name: "SM City Iloilo", kind: "mall", lat: 10.716, lon: 122.548, address: "Iloilo City", openingHours: null },
];

export function seedCoolingPlaces(lat: number, lon: number, radiusM: number): CoolingPlace[] {
  const places: CoolingPlace[] = SEED_PLACES.map((place) => ({ ...place, distanceM: 0 }));
  return finalizeCoolingPlaces(places, null, radiusM, { lat, lon });
}
