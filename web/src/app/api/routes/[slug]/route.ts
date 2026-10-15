import type { NextRequest } from "next/server";
import { langOf, notFoundJson, staticJson, type SlugContext } from "@/server/api";
import { getRoute } from "@/server/data";

/** GET /api/routes/:slug?lang= (slug like `dhaka-to-bandarban`) */
export async function GET(request: NextRequest, { params }: SlugContext) {
  const { slug } = await params;
  const route = await getRoute(slug, langOf(request));
  return route ? staticJson(route) : notFoundJson();
}
