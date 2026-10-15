import type { NextRequest } from "next/server";
import { langOf, staticJson } from "@/server/api";
import { listFamous } from "@/server/data";

/** GET /api/famous?lang= — famous foods and crafts of every district. */
export async function GET(request: NextRequest) {
  return staticJson(await listFamous(langOf(request)));
}
