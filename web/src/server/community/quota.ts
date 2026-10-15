/**
 * Daily quotas for open submissions, kept in the `quota_hits` table so they survive restarts.
 * The day is the Bangladesh calendar day; keys are hashed IPs or `u:<user id>`.
 */
import { and, eq, lt, sql } from "drizzle-orm";
import { dhakaDay } from "@/lib/community/season";
import { DAILY, type QuotaScope } from "@/lib/community/rules";
import { getDb } from "../db/client";
import { quotaHits } from "../db/schema";

export type QuotaStatus = { limit: number; used: number; remaining: number };

export function quotaStatus(scope: QuotaScope, key: string, now = new Date()): QuotaStatus {
  const limit = DAILY[scope];
  const row = getDb()
    .select({ count: quotaHits.count })
    .from(quotaHits)
    .where(
      and(eq(quotaHits.day, dhakaDay(now)), eq(quotaHits.scope, scope), eq(quotaHits.key, key)),
    )
    .get();
  const used = Math.min(limit, row?.count ?? 0);
  return { limit, used, remaining: Math.max(0, limit - used) };
}

/**
 * Takes one unit of today's quota. Atomic: the count only goes up while it is under the limit,
 * so two requests at once cannot both take the last unit. False when the quota is used up.
 */
export function consumeQuota(scope: QuotaScope, key: string, now = new Date()): boolean {
  const limit = DAILY[scope];
  const db = getDb();
  const day = dhakaDay(now);
  const changes = db
    .insert(quotaHits)
    .values({ day, scope, key, count: 1 })
    .onConflictDoUpdate({
      target: [quotaHits.day, quotaHits.scope, quotaHits.key],
      set: { count: sql`${quotaHits.count} + 1` },
      setWhere: sql`${quotaHits.count} < ${limit}`,
    })
    .run().changes;
  if (Math.random() < 0.02) {
    // Housekeeping now and then: forget days older than a week.
    const weekAgo = dhakaDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    db.delete(quotaHits).where(lt(quotaHits.day, weekAgo)).run();
  }
  return changes > 0;
}

/** Gives back one unit (when the submission failed after the quota was taken). */
export function refundQuota(scope: QuotaScope, key: string, now = new Date()): void {
  getDb()
    .update(quotaHits)
    .set({
      count: sql`case when ${quotaHits.count} > 0 then ${quotaHits.count} - 1 else 0 end`,
    })
    .where(
      and(eq(quotaHits.day, dhakaDay(now)), eq(quotaHits.scope, scope), eq(quotaHits.key, key)),
    )
    .run();
}
