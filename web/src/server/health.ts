import { readFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../../package.json";
import { getDb } from "./db/client";
import { logger } from "./log";

export type HealthReport = {
  status: "ok" | "error";
  /** `version` from web/package.json. */
  version: string;
  /** The Next.js build id (`.next/BUILD_ID`), or null in development. */
  build: string | null;
  /** Seconds since this process started. */
  uptime: number;
  time: string;
  db: { ok: true; places: number; ms: number } | { ok: false; error: string };
};

let buildId: string | null | undefined;

function readBuildId(): string | null {
  if (buildId !== undefined) return buildId;
  try {
    buildId = readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim() || null;
  } catch {
    buildId = null;
  }
  return buildId;
}

/** Is the database reachable and seeded? A cheap read of one indexed count. */
export function checkHealth(): HealthReport {
  const started = performance.now();
  let db: HealthReport["db"];
  try {
    const row = getDb().$client.prepare("SELECT count(*) AS n FROM places").get() as {
      n: number;
    };
    db =
      row.n > 0
        ? { ok: true, places: row.n, ms: Math.round((performance.now() - started) * 10) / 10 }
        : { ok: false, error: "database is empty (run npm run db:seed)" };
  } catch (error) {
    logger.error("health: database check failed", { error });
    db = { ok: false, error: "database unreachable" };
  }
  return {
    status: db.ok ? "ok" : "error",
    version: pkg.version,
    build: readBuildId(),
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
    db,
  };
}
