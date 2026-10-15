/**
 * View history: the place and district pages a signed-in user opened. Repeated views of the same
 * page within 30 minutes count once, and only the newest 1,000 views are kept.
 */
import { and, count, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "../db/client";
import { districts, places, viewHistory } from "../db/schema";
import type { Lang } from "../data/lang";

export const HISTORY_PAGE_SIZE = 20;
export const MAX_HISTORY = 1000;
const DEDUPE_MS = 30 * 60_000;

/** SQLite's CURRENT_TIMESTAMP format (UTC), so stored and compared times sort the same way. */
const sqlTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

export type ViewInput = { placeId?: unknown; districtId?: unknown };

/** Records a view. Returns false when the target does not exist. */
export function recordView(userId: number, input: ViewInput, now = new Date()): boolean {
  const db = getDb();
  let placeId: number | null = null;
  let districtId: number | null = null;
  if (Number.isInteger(input.placeId)) {
    const place = db
      .select({ id: places.id, districtId: places.districtId })
      .from(places)
      .where(eq(places.id, input.placeId as number))
      .get();
    if (!place) return false;
    placeId = place.id;
    districtId = place.districtId;
  } else if (Number.isInteger(input.districtId)) {
    const district = db
      .select({ id: districts.id })
      .from(districts)
      .where(eq(districts.id, input.districtId as number))
      .get();
    if (!district) return false;
    districtId = district.id;
  } else {
    return false;
  }

  const since = sqlTime(new Date(now.getTime() - DEDUPE_MS));
  const recent = db
    .select({ id: viewHistory.id })
    .from(viewHistory)
    .where(
      and(
        eq(viewHistory.userId, userId),
        placeId === null ? isNull(viewHistory.placeId) : eq(viewHistory.placeId, placeId),
        eq(viewHistory.districtId, districtId!),
        gt(viewHistory.viewedAt, since),
      ),
    )
    .get();
  if (recent) {
    db.update(viewHistory)
      .set({ viewedAt: sqlTime(now) })
      .where(eq(viewHistory.id, recent.id))
      .run();
    return true;
  }
  db.insert(viewHistory)
    .values({ userId, placeId, districtId, viewedAt: sqlTime(now) })
    .run();

  // Keep the newest MAX_HISTORY rows.
  const cutoff = db
    .select({ viewedAt: viewHistory.viewedAt })
    .from(viewHistory)
    .where(eq(viewHistory.userId, userId))
    .orderBy(desc(viewHistory.viewedAt), desc(viewHistory.id))
    .limit(1)
    .offset(MAX_HISTORY)
    .get();
  if (cutoff) {
    db.delete(viewHistory)
      .where(and(eq(viewHistory.userId, userId), lt(viewHistory.viewedAt, cutoff.viewedAt)))
      .run();
  }
  return true;
}

export type HistoryItem = {
  id: number;
  /** ISO time. */
  viewedAt: string;
  place: { slug: string; name: string } | null;
  district: { slug: string; name: string } | null;
};

export type HistoryPage = {
  items: HistoryItem[];
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

export function listHistory(
  userId: number,
  {
    page = 1,
    lang = "bn",
    pageSize = HISTORY_PAGE_SIZE,
  }: { page?: number; lang?: Lang; pageSize?: number } = {},
): HistoryPage {
  const db = getDb();
  const total =
    db.select({ n: count() }).from(viewHistory).where(eq(viewHistory.userId, userId)).get()?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const d = alias(districts, "d");
  const rows = db
    .select({
      id: viewHistory.id,
      viewedAt: viewHistory.viewedAt,
      placeSlug: places.slug,
      placeBn: places.nameBn,
      placeEn: places.nameEn,
      districtSlug: d.slug,
      districtBn: d.nameBn,
      districtEn: d.nameEn,
    })
    .from(viewHistory)
    .leftJoin(places, eq(places.id, viewHistory.placeId))
    .leftJoin(d, eq(d.id, viewHistory.districtId))
    .where(eq(viewHistory.userId, userId))
    .orderBy(desc(viewHistory.viewedAt), desc(viewHistory.id))
    .limit(pageSize)
    .offset((current - 1) * pageSize)
    .all();
  return {
    items: rows.map((r) => ({
      id: r.id,
      viewedAt: `${r.viewedAt.replace(" ", "T")}${r.viewedAt.endsWith("Z") ? "" : "Z"}`,
      place: r.placeSlug
        ? { slug: r.placeSlug, name: (lang === "bn" ? r.placeBn : r.placeEn) ?? r.placeSlug }
        : null,
      district: r.districtSlug
        ? {
            slug: r.districtSlug,
            name: (lang === "bn" ? r.districtBn : r.districtEn) ?? r.districtSlug,
          }
        : null,
    })),
    page: current,
    pageCount,
    total,
    pageSize,
  };
}

/** Deletes the whole history. Returns how many views were removed. */
export function clearHistory(userId: number): number {
  return getDb().delete(viewHistory).where(eq(viewHistory.userId, userId)).run().changes;
}

/** How many views the user has (used by the profile). */
export function historyCount(userId: number): number {
  return (
    getDb()
      .select({ n: sql<number>`count(*)` })
      .from(viewHistory)
      .where(eq(viewHistory.userId, userId))
      .get()?.n ?? 0
  );
}
