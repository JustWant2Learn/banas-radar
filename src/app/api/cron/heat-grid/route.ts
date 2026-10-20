import { NextRequest } from "next/server";
import { advanceHeatRefresh } from "@/lib/heatAreas";

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
    const result = await advanceHeatRefresh();
    return Response.json({
      ok: true,
      complete: result.complete,
      samples: result.samples,
      needed: result.needed,
      recordedAt: result.recordedAt,
      generatedAt: result.published?.generatedAt ?? result.recordedAt,
      areas: result.published ? Object.keys(result.published.areas).length : result.samples,
      hottest: result.published?.hottest.name ?? null,
      coolest: result.published?.coolest.name ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
