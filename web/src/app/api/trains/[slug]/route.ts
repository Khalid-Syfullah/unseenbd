import type { NextRequest } from "next/server";
import { langOf, notFoundJson, staticJson, type SlugContext } from "@/server/api";
import { getTrain } from "@/server/data";

/** GET /api/trains/:slug?lang= */
export async function GET(request: NextRequest, { params }: SlugContext) {
  const { slug } = await params;
  const train = await getTrain(slug, langOf(request));
  return train ? staticJson(train) : notFoundJson();
}
