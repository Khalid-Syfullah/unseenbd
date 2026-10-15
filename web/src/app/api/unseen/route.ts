import type { NextRequest } from "next/server";
import { langOf, staticJson } from "@/server/api";
import { listUnseenByDivision } from "@/server/data";

/** GET /api/unseen?lang= — lesser-known places grouped by division. */
export async function GET(request: NextRequest) {
  return staticJson(await listUnseenByDivision(langOf(request)));
}
