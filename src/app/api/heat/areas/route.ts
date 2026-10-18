import { getLatestHeatAreas, isMostlyComplete, refreshHeatAreas } from "@/lib/heatAreas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const STALE_MS = 70 * 60 * 1000;

export async function GET() {
  try {
    const existing = await getLatestHeatAreas();
    const age = existing ? Date.now() - Date.parse(existing.recordedAt) : Number.POSITIVE_INFINITY;
    const complete = existing ? await isMostlyComplete(existing) : false;
    const needsRefresh = !existing || Number.isNaN(age) || age > STALE_MS || !complete;
    const payload = needsRefresh ? await refreshOrStale(existing) : existing;

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

async function refreshOrStale(existing: Awaited<ReturnType<typeof getLatestHeatAreas>>) {
  try {
    return await refreshHeatAreas();
  } catch (error) {
    if (existing) return existing;
    throw error;
  }
}
