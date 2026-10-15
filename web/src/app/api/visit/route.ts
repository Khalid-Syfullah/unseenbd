import { NextResponse, type NextRequest } from "next/server";
import { recordVisit, visitLimiter } from "@/server/admin/stats";
import { checkLimits, readJson, sameOrigin } from "@/server/auth/http";
import { clientIp } from "@/server/rate-limit";

/**
 * `POST /api/visit` `{path}` → `204`. Adds one to the page's counter for today. No cookie is
 * read or set and nothing that identifies the visitor is stored; the answer is the same whether
 * or not the page is counted.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const quiet = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(request)) return quiet;
  if (checkLimits([visitLimiter, clientIp(request.headers)])) return quiet;
  const read = await readJson(request, 1024);
  if (read.ok) recordVisit(read.body.path);
  return quiet;
}
