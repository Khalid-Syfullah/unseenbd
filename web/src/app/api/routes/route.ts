import type { NextRequest } from "next/server";
import { langOf, staticJson } from "@/server/api";
import { listRoutes, listRoutesFromDhaka } from "@/server/data";

/** GET /api/routes?lang= — the detailed routes and the Dhaka → 63 districts summary. */
export async function GET(request: NextRequest) {
  const lang = langOf(request);
  const [routes, fromDhaka] = await Promise.all([listRoutes(lang), listRoutesFromDhaka(lang)]);
  return staticJson({ routes, fromDhaka });
}
