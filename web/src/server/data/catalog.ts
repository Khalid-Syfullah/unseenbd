import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { curation, divisions, kinds, months, places } from "../db/schema";
import type { Lang } from "./lang";
import { inSeasonSql } from "./places";
import {
  placeSummariesBySlug,
  selectPlaces,
  toDivisionRef,
  toKindRef,
  toPlaceSummary,
} from "./shared";
import type {
  KindWithCount,
  MonthWithCount,
  PlaceSummary,
  TrendingItem,
  UnseenByDivision,
} from "./types";

/** The 11 place kinds in display order, with place counts. */
export async function listKinds(lang: Lang = "bn"): Promise<KindWithCount[]> {
  const db = getDb();
  const counts = new Map(
    db
      .select({ kind: places.kind, n: count() })
      .from(places)
      .groupBy(places.kind)
      .all()
      .map((r) => [r.kind, r.n]),
  );
  return db
    .select()
    .from(kinds)
    .orderBy(asc(kinds.position))
    .all()
    .map((k) => ({ ...toKindRef(k, lang), position: k.position, count: counts.get(k.key) ?? 0 }));
}

export async function getKind(key: string, lang: Lang = "bn"): Promise<KindWithCount | null> {
  return (await listKinds(lang)).find((k) => k.key === key) ?? null;
}

/** The 12 months with the number of places in season in each. */
export async function listMonths(lang: Lang = "bn"): Promise<MonthWithCount[]> {
  const db = getDb();
  return db
    .select()
    .from(months)
    .orderBy(asc(months.month))
    .all()
    .map((m) => ({
      month: m.month,
      slug: m.slug,
      name: lang === "bn" ? m.nameBn : m.nameEn,
      nameBn: m.nameBn,
      nameEn: m.nameEn,
      count: db.select({ n: count() }).from(places).where(inSeasonSql(m.month)).get()?.n ?? 0,
    }));
}

/** A month by number (1–12) or slug (`november`). */
export async function getMonth(
  monthOrSlug: number | string,
  lang: Lang = "bn",
): Promise<MonthWithCount | null> {
  const all = await listMonths(lang);
  return all.find((m) => m.month === monthOrSlug || m.slug === monthOrSlug) ?? null;
}

function curatedSlugs(list: "popular" | "unseen" | "trending") {
  const db = getDb();
  return db
    .select()
    .from(curation)
    .where(eq(curation.list, list))
    .orderBy(asc(curation.position))
    .all();
}

/** The 24 editor-picked popular destinations, optionally only one division's. */
export async function listPopular(
  lang: Lang = "bn",
  division?: string | null,
): Promise<PlaceSummary[]> {
  const db = getDb();
  const items = placeSummariesBySlug(
    db,
    curatedSlugs("popular").map((r) => r.placeSlug),
    lang,
  );
  return division ? items.filter((p) => p.division.slug === division) : items;
}

/** Lesser-known places grouped by division (display order), each group ordered by district. */
export async function listUnseenByDivision(lang: Lang = "bn"): Promise<UnseenByDivision[]> {
  const db = getDb();
  const divs = db.select().from(divisions).orderBy(asc(divisions.position)).all();
  return divs.map((dv) => {
    const rows = selectPlaces(db)
      .where(and(eq(places.unseen, true), eq(divisions.slug, dv.slug)))
      .orderBy(asc(places.districtId), asc(places.districtPosition))
      .all();
    return {
      ...toDivisionRef(dv, lang),
      count: rows.length,
      places: rows.map((r) => toPlaceSummary(r, lang)),
    };
  });
}

/** The trending snapshot (votes, likes, comments), in ranking order. */
export async function listTrending(lang: Lang = "bn"): Promise<{
  month: number | null;
  items: TrendingItem[];
}> {
  const db = getDb();
  const rows = curatedSlugs("trending");
  const summaries = new Map(
    placeSummariesBySlug(
      db,
      rows.map((r) => r.placeSlug),
      lang,
    ).map((p) => [p.slug, p]),
  );
  return {
    month: rows[0]?.month ?? null,
    items: rows.flatMap((r) => {
      const place = summaries.get(r.placeSlug);
      return place
        ? [
            {
              place,
              votes: r.votes ?? 0,
              likes: r.likes ?? 0,
              comments: r.comments ?? 0,
              stars: r.stars ?? place.stars,
            },
          ]
        : [];
    }),
  };
}
