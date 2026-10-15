import { NextResponse } from "next/server";
import { checkHealth } from "@/server/health";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — for nginx, pm2 and uptime checks. 200 `{status: "ok", version, db: {ok:
 * true, …}}` when the database answers, 503 `{status: "error", …}` when it does not. Never cached
 * and not rate limited.
 */
export async function GET() {
  const report = checkHealth();
  return NextResponse.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

/** HEAD /api/health — the same check without a body. */
export async function HEAD() {
  const report = checkHealth();
  return new Response(null, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
