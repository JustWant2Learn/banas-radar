import { GET as getAreas } from "../areas/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET() {
  return getAreas();
}
