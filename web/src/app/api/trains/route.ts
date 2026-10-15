import type { NextRequest } from "next/server";
import { langOf, staticJson } from "@/server/api";
import { listTrains } from "@/server/data";

/** GET /api/trains?lang= — all intercity trains. */
export async function GET(request: NextRequest) {
  return staticJson(await listTrains(langOf(request)));
}
