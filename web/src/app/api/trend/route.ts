import type { NextRequest } from "next/server";
import { langOf, staticJson } from "@/server/api";
import { listTrending } from "@/server/data";

/** GET /api/trend?lang= — the seasonal trending ranking (seeded snapshot until voting lands). */
export async function GET(request: NextRequest) {
  return staticJson(await listTrending(langOf(request)));
}
