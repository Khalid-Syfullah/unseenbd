import type { NextRequest } from "next/server";
import { langOf, notFoundJson, staticJson, type SlugContext } from "@/server/api";
import { getPlace } from "@/server/data";

/** GET /api/places/:slug?lang= */
export async function GET(request: NextRequest, { params }: SlugContext) {
  const { slug } = await params;
  const place = await getPlace(slug, langOf(request));
  return place ? staticJson(place) : notFoundJson();
}
