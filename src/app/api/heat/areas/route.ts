import { getLatestHeatAreas, refreshHeatAreas } from "@/lib/heatAreas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const existing = await getLatestHeatAreas();
    const payload = existing ?? (await refreshHeatAreas());

    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
