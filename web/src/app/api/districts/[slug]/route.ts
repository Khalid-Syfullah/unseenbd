import type { NextRequest } from "next/server";
import { langOf, notFoundJson, staticJson, type SlugContext } from "@/server/api";
import { getDistrict } from "@/server/data";

/** GET /api/districts/:slug?lang= */
export async function GET(request: NextRequest, { params }: SlugContext) {
  const { slug } = await params;
  const district = await getDistrict(slug, langOf(request));
  return district ? staticJson(district) : notFoundJson();
}
