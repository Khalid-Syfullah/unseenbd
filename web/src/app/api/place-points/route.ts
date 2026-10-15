import type { NextRequest } from "next/server";
import { langOf, staticJson } from "@/server/api";
import { listPlacePoints } from "@/server/data";

/** GET /api/place-points?lang= — every place with coordinates, for maps and "near me". */
export async function GET(request: NextRequest) {
  return staticJson(await listPlacePoints(langOf(request)));
}
