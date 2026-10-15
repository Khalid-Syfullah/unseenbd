import type { NextRequest } from "next/server";
import { langOf, staticJson } from "@/server/api";
import { listPopular } from "@/server/data";

/** GET /api/popular?division=&lang= — the 24 popular destinations. */
export async function GET(request: NextRequest) {
  const division = request.nextUrl.searchParams.get("division");
  return staticJson(await listPopular(langOf(request), division));
}
