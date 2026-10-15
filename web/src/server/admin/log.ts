import { desc } from "drizzle-orm";
import { getDb } from "../db/client";
import { adminLog } from "../db/schema";

/** Records one admin action. Every change made in the moderation screens goes through here. */
export function logAdmin(
  adminId: number,
  action: string,
  target: string,
  ids: string[],
  detail?: string,
): void {
  getDb()
    .insert(adminLog)
    .values({ adminId, action, target, ids, detail: detail ?? null })
    .run();
}

/** The latest log entries, newest first. */
export function recentAdminLog(limit = 50) {
  return getDb().select().from(adminLog).orderBy(desc(adminLog.id)).limit(limit).all();
}
