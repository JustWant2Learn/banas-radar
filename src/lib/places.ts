export interface Place {
  id: string;
  name: string;
  /** Province or region, shown as a subtitle. */
  region: string;
  lat: number;
  lon: number;
}

export interface LatLng {
  lat: number;
  lon: number;
}

/** Fallback map center when geolocation is unavailable or denied. */
export const METRO_MANILA_CENTER: LatLng = { lat: 14.5995, lon: 120.9842 };

/**
 * Major cities and municipalities tracked on the radar map.
 * Kept small on purpose: one Open-Meteo request covers all of them.
 */
export const MAJOR_PLACES: readonly Place[] = [
  // Metro Manila
  { id: "manila", name: "Manila", region: "Metro Manila", lat: 14.5995, lon: 120.9842 },
  { id: "quezon-city", name: "Quezon City", region: "Metro Manila", lat: 14.676, lon: 121.0437 },
  { id: "makati", name: "Makati", region: "Metro Manila", lat: 14.5547, lon: 121.0244 },
  { id: "pasig", name: "Pasig", region: "Metro Manila", lat: 14.5764, lon: 121.0851 },
  { id: "taguig", name: "Taguig", region: "Metro Manila", lat: 14.5176, lon: 121.0509 },
  { id: "caloocan", name: "Caloocan", region: "Metro Manila", lat: 14.6507, lon: 120.9676 },
  { id: "paranaque", name: "Parañaque", region: "Metro Manila", lat: 14.4793, lon: 121.0198 },
  { id: "marikina", name: "Marikina", region: "Metro Manila", lat: 14.6507, lon: 121.1029 },
  // Luzon
  { id: "baguio", name: "Baguio", region: "Benguet", lat: 16.4023, lon: 120.596 },
  { id: "tuguegarao", name: "Tuguegarao", region: "Cagayan", lat: 17.6132, lon: 121.7269 },
  { id: "laoag", name: "Laoag", region: "Ilocos Norte", lat: 18.1978, lon: 120.5936 },
  { id: "dagupan", name: "Dagupan", region: "Pangasinan", lat: 16.0433, lon: 120.3333 },
  { id: "san-fernando-pampanga", name: "San Fernando", region: "Pampanga", lat: 15.0286, lon: 120.6898 },
  { id: "angeles", name: "Angeles", region: "Pampanga", lat: 15.1455, lon: 120.5876 },
  { id: "cabanatuan", name: "Cabanatuan", region: "Nueva Ecija", lat: 15.4865, lon: 120.9734 },
  { id: "olongapo", name: "Olongapo", region: "Zambales", lat: 14.8386, lon: 120.2842 },
  { id: "antipolo", name: "Antipolo", region: "Rizal", lat: 14.5863, lon: 121.1759 },
  { id: "dasmarinas", name: "Dasmariñas", region: "Cavite", lat: 14.3294, lon: 120.9367 },
  { id: "calamba", name: "Calamba", region: "Laguna", lat: 14.2117, lon: 121.1653 },
  { id: "batangas", name: "Batangas City", region: "Batangas", lat: 13.7565, lon: 121.0583 },
  { id: "lucena", name: "Lucena", region: "Quezon", lat: 13.9373, lon: 121.6174 },
  { id: "legazpi", name: "Legazpi", region: "Albay", lat: 13.1391, lon: 123.7438 },
  { id: "naga", name: "Naga", region: "Camarines Sur", lat: 13.6218, lon: 123.1948 },
  { id: "puerto-princesa", name: "Puerto Princesa", region: "Palawan", lat: 9.7392, lon: 118.7353 },
  // Visayas
  { id: "cebu", name: "Cebu City", region: "Cebu", lat: 10.3157, lon: 123.8854 },
  { id: "iloilo", name: "Iloilo City", region: "Iloilo", lat: 10.7202, lon: 122.5621 },
  { id: "bacolod", name: "Bacolod", region: "Negros Occidental", lat: 10.6407, lon: 122.9689 },
  { id: "tacloban", name: "Tacloban", region: "Leyte", lat: 11.2447, lon: 125.0036 },
  { id: "dumaguete", name: "Dumaguete", region: "Negros Oriental", lat: 9.3068, lon: 123.3054 },
  { id: "tagbilaran", name: "Tagbilaran", region: "Bohol", lat: 9.6475, lon: 123.8556 },
  { id: "roxas", name: "Roxas City", region: "Capiz", lat: 11.5853, lon: 122.7511 },
  // Mindanao
  { id: "davao", name: "Davao City", region: "Davao del Sur", lat: 7.1907, lon: 125.4553 },
  { id: "cagayan-de-oro", name: "Cagayan de Oro", region: "Misamis Oriental", lat: 8.4542, lon: 124.6319 },
  { id: "zamboanga", name: "Zamboanga City", region: "Zamboanga del Sur", lat: 6.9214, lon: 122.079 },
  { id: "general-santos", name: "General Santos", region: "South Cotabato", lat: 6.1164, lon: 125.1716 },
  { id: "butuan", name: "Butuan", region: "Agusan del Norte", lat: 8.9475, lon: 125.5406 },
  { id: "cotabato", name: "Cotabato City", region: "Maguindanao", lat: 7.2047, lon: 124.2318 },
  { id: "iligan", name: "Iligan", region: "Lanao del Norte", lat: 8.228, lon: 124.2452 },
];

export function findPlace(id: string): Place | undefined {
  return MAJOR_PLACES.find((p) => p.id === id);
}
