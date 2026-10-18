import { NextRequest } from "next/server";
import { refreshHeatAreas } from "@/lib/heatAreas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await refreshHeatAreas();
    return Response.json({
      ok: true,
      generatedAt: payload.generatedAt,
      recordedAt: payload.recordedAt,
      areas: Object.keys(payload.areas).length,
      hottest: payload.hottest.name,
      coolest: payload.coolest.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
