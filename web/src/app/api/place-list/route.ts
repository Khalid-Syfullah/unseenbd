import type { NextRequest } from "next/server";
import { parseMonth } from "@/lib/months";
import { badRequest, langOf, notFoundJson, staticJson } from "@/server/api";
import { getKind, getMonth, placesByKind, placesInMonth } from "@/server/data";

/** GET /api/place-list?kind=… or ?month=… (number or name), with ?lang= */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lang = langOf(request);
  const kindParam = params.get("kind");
  const monthParam = params.get("month");

  if (kindParam) {
    const kind = await getKind(kindParam, lang);
    if (!kind) return notFoundJson();
    return staticJson({ kind, places: await placesByKind(kind.key, lang) });
  }
  if (monthParam) {
    const m = parseMonth(monthParam);
    if (m === null) return badRequest("month must be 1–12 or a month name");
    const month = await getMonth(m, lang);
    return staticJson({ month, places: await placesInMonth(m, lang) });
  }
  return badRequest("pass kind or month");
}
