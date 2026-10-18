import { NextRequest } from "next/server";
import { clampRadiusM, parseCoolingKinds } from "@/lib/cooling";
import { isFiniteCoordinate } from "@/lib/geo";
import { fetchCoolingPlaces } from "@/lib/overpass";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  const radiusM = clampRadiusM(Number(request.nextUrl.searchParams.get("radius") ?? ""));
  const kinds = parseCoolingKinds(request.nextUrl.searchParams.get("kind"));

  if (!isFiniteCoordinate(lat, lon)) {
    return Response.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const payload = await fetchCoolingPlaces({ lat, lon, radiusM, kinds });
    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
