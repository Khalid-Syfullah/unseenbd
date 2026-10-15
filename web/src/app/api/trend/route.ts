import { NextResponse, type NextRequest } from "next/server";
import { langOf } from "@/server/api";
import { listTrending } from "@/server/data";

/**
 * GET /api/trend?lang= — this season's trending ranking (live votes, plus the seeded snapshot
 * during the season it was taken in). Votes change all the time, so caches keep it a minute.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(await listTrending(langOf(request)), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}
