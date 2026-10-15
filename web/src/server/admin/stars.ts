/**
 * Editorial stars for places (0–1000, shown as ★ ⌊stars/100⌋/10). An override is stored in
 * `place_stars` and written to `places.stars`; the seed re-applies it, and "reset" goes back to
 * the seeded score.
 */
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { districts, placeStars, places } from "../db/schema";

export type StarRow = {
  slug: string;
  name: string;
  district: string;
  /** The score 0–10 shown to visitors. */
  score: number;
  stars: number;
  /** True when an admin changed it. */
  edited: boolean;
};

export const STARS_PAGE_SIZE = 25;

export function listStars(q: string, page: number) {
  const db = getDb();
  const term = q
    .trim()
    .slice(0, 60)
    .replace(/[%_\\]/g, "");
  const where = term
    ? or(
        like(places.nameEn, `%${term}%`),
        like(places.nameBn, `%${term}%`),
        like(places.slug, `%${term}%`),
      )
    : undefined;
  const total =
    db
      .select({ n: sql<number>`count(*)` })
      .from(places)
      .where(where)
      .get()?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / STARS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const rows = db
    .select({ p: places, d: districts, o: placeStars.placeId })
    .from(places)
    .innerJoin(districts, eq(places.districtId, districts.id))
    .leftJoin(placeStars, eq(placeStars.placeId, places.id))
    .where(where)
    .orderBy(desc(places.stars), asc(places.id))
    .limit(STARS_PAGE_SIZE)
    .offset((current - 1) * STARS_PAGE_SIZE)
    .all();
  const items: StarRow[] = rows.map(({ p, d, o }) => ({
    slug: p.slug,
    name: p.nameEn,
    district: d.nameEn,
    score: Math.min(10, Math.floor(p.stars / 100)),
    stars: p.stars,
    edited: o !== null,
  }));
  return { items, total, page: current, pageCount };
}

/** Sets a place's score (0–10), or resets it with `null`. Returns the new row, or null. */
export function setStars(
  slug: string,
  score: number | null,
  adminId: number,
): { slug: string; score: number; stars: number; edited: boolean } | null {
  const db = getDb();
  const place = db.select().from(places).where(eq(places.slug, slug)).get();
  if (!place) return null;
  const existing = db.select().from(placeStars).where(eq(placeStars.placeId, place.id)).get();
  if (score === null) {
    if (existing) {
      db.transaction((tx) => {
        tx.update(places).set({ stars: existing.original }).where(eq(places.id, place.id)).run();
        tx.delete(placeStars).where(eq(placeStars.placeId, place.id)).run();
      });
    }
    const stars = existing?.original ?? place.stars;
    return { slug, score: Math.min(10, Math.floor(stars / 100)), stars, edited: false };
  }
  const stars = score * 100;
  db.transaction((tx) => {
    tx.insert(placeStars)
      .values({
        placeId: place.id,
        stars,
        original: existing?.original ?? place.stars,
        updatedBy: adminId,
      })
      .onConflictDoUpdate({
        target: placeStars.placeId,
        set: { stars, updatedBy: adminId, updatedAt: new Date().toISOString() },
      })
      .run();
    tx.update(places)
      .set({ stars })
      .where(and(eq(places.id, place.id)))
      .run();
  });
  return { slug, score, stars, edited: true };
}
