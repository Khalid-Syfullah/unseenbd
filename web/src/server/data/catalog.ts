import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { curation, divisions, kinds, months, places } from "../db/schema";
import { seasonOf, type SeasonInfo } from "@/lib/community/season";
import { liveComments, liveVotes, placeVotes, snapshotSeason } from "../community/trend";
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

/** How many places the trending ranking returns at most. */
export const TRENDING_MAX = 100;

/**
 * This season's trending ranking: live votes (one per visitor per place per season) plus, during
 * the season it was taken in, the seeded snapshot. Ordered by votes, then the snapshot's order,
 * then the editorial score.
 */
export async function listTrending(
  lang: Lang = "bn",
  now: Date = new Date(),
): Promise<{
  month: number | null;
  season: SeasonInfo;
  items: TrendingItem[];
}> {
  const db = getDb();
  const season = seasonOf(now);
  const snapshot = curatedSlugs("trending");
  const snapshotMonth = snapshot[0]?.month ?? null;
  const base = snapshotSeason(snapshotMonth) === season.key ? snapshot : [];
  const votes = liveVotes(season.key);
  const comments = liveComments(season.key);

  const idBySlug = new Map(
    db
      .select({ id: places.id, slug: places.slug })
      .from(places)
      .all()
      .map((r) => [r.slug, r.id]),
  );
  const slugById = new Map([...idBySlug].map(([slug, id]) => [id, slug]));
  const slugs = [
    ...new Set([
      ...base.map((r) => r.placeSlug),
      ...[...votes.keys()].map((id) => slugById.get(id)).filter((s): s is string => Boolean(s)),
    ]),
  ];
  const summaries = new Map(placeSummariesBySlug(db, slugs, lang).map((p) => [p.slug, p]));
  const baseBySlug = new Map(base.map((r, i) => [r.placeSlug, { row: r, order: i }]));

  const items = slugs.flatMap((slug) => {
    const place = summaries.get(slug);
    if (!place) return [];
    const b = baseBySlug.get(slug)?.row;
    const id = idBySlug.get(slug)!;
    return [
      {
        place,
        votes: (b?.votes ?? 0) + (votes.get(id) ?? 0),
        likes: b?.likes ?? 0,
        comments: (b?.comments ?? 0) + (comments.get(id) ?? 0),
        stars: b?.stars ?? place.stars,
      },
    ];
  });
  const order = (slug: string) => baseBySlug.get(slug)?.order ?? Number.MAX_SAFE_INTEGER;
  items.sort(
    (a, b) =>
      b.votes - a.votes ||
      order(a.place.slug) - order(b.place.slug) ||
      b.stars - a.stars ||
      a.place.slug.localeCompare(b.place.slug),
  );
  return { month: snapshotMonth, season, items: items.slice(0, TRENDING_MAX) };
}

/** This season's trending votes for a place (snapshot during its season, plus live votes). */
export async function getTrendVotes(slug: string, now: Date = new Date()): Promise<number> {
  const season = seasonOf(now);
  const snapshot = curatedSlugs("trending");
  const base =
    snapshotSeason(snapshot[0]?.month ?? null) === season.key
      ? (snapshot.find((r) => r.placeSlug === slug)?.votes ?? 0)
      : 0;
  const place = getDb().select({ id: places.id }).from(places).where(eq(places.slug, slug)).get();
  return place ? base + placeVotes(place.id, season.key) : base;
}
