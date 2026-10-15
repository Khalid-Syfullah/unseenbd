import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  like,
  lte,
  or,
  sql,
  type Column,
  type SQL,
} from "drizzle-orm";
import { haversineKm } from "@/lib/geo";
import { matchPlaceIds } from "./search";
import { getDb } from "../db/client";
import { districts, places, routes } from "../db/schema";
import { pick, type Lang } from "./lang";
import { placeSummariesBySlug, selectPlaces, toPlaceSummary } from "./shared";
import type {
  FromDhaka,
  NearbyPlace,
  PlaceDetail,
  PlaceFilters,
  PlacePage,
  PlacePoint,
  PlaceSummary,
} from "./types";

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

/** SQL condition: the place's best season includes `month` (handles 11 → 3 wrap-around). */
export function inSeasonSql(month: number): SQL {
  const from = places.bestFromMonth;
  const to = places.bestToMonth;
  return or(
    and(lte(from, to), lte(from, month), gte(to, month)),
    and(gt(from, to), or(lte(from, month), gte(to, month))),
  )!;
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Search condition over place and district names (bn/en) and slugs. */
function searchSql(q: string): SQL | undefined {
  const term = q.trim().replace(/\s+/g, " ");
  if (!term) return undefined;
  const pattern = `%${escapeLike(term)}%`;
  const slugish = term
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const likeEsc = (col: Column, p: string) => sql`${col} LIKE ${p} ESCAPE '\\'`;
  const conds: SQL[] = [
    likeEsc(places.nameEn, pattern),
    likeEsc(places.nameBn, pattern),
    likeEsc(districts.nameEn, pattern),
    likeEsc(districts.nameBn, pattern),
  ];
  if (slugish) {
    // `slugish` is only [a-z0-9-], so it needs no escaping.
    conds.push(like(places.slug, `%${slugish}%`));
    conds.push(like(districts.slug, `%${slugish}%`));
  }
  // Transliteration and accents are matched in code; add those places to the SQL matches.
  const ids = matchPlaceIds(term);
  if (ids.length) conds.push(inArray(places.id, ids));
  return or(...conds);
}

function filtersSql(f: PlaceFilters): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.district !== undefined && f.district !== null && f.district !== "") {
    const asNumber = typeof f.district === "number" ? f.district : Number(f.district);
    conds.push(
      Number.isInteger(asNumber) && String(asNumber) === String(f.district)
        ? eq(places.districtId, asNumber)
        : eq(districts.slug, String(f.district)),
    );
  }
  if (f.division) conds.push(eq(districts.division, f.division));
  if (f.kind) conds.push(eq(places.kind, f.kind));
  if (f.month) conds.push(inSeasonSql(f.month));
  if (f.unseen === true) conds.push(eq(places.unseen, true));
  if (f.popular === true) conds.push(eq(places.popular, true));
  if (f.q) conds.push(searchSql(f.q));
  return and(...conds);
}

const DEFAULT_ORDER = [desc(places.stars), asc(places.id)];

/** Filtered, paginated place cards (Explore, `/api/places`). Ordered by editorial score. */
export async function listPlaces(filters: PlaceFilters = {}): Promise<PlacePage> {
  const db = getDb();
  const lang = filters.lang ?? "bn";
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(filters.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const where = filtersSql(filters);

  const total =
    db
      .select({ n: count() })
      .from(places)
      .innerJoin(districts, eq(places.districtId, districts.id))
      .where(where)
      .get()?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(filters.page ?? 1)));

  const rows = selectPlaces(db)
    .where(where)
    .orderBy(...DEFAULT_ORDER)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  return { items: rows.map((r) => toPlaceSummary(r, lang)), total, page, pageSize, pageCount };
}

/** Every place matching the filters, unpaginated, ordered by editorial score. */
export async function allPlaces(
  filters: Omit<PlaceFilters, "page" | "pageSize"> = {},
): Promise<PlaceSummary[]> {
  const db = getDb();
  return selectPlaces(db)
    .where(filtersSql(filters))
    .orderBy(...DEFAULT_ORDER)
    .all()
    .map((r) => toPlaceSummary(r, filters.lang ?? "bn"));
}

/** Places whose best season includes `month` (1–12), best first. */
export async function placesInMonth(month: number, lang: Lang = "bn"): Promise<PlaceSummary[]> {
  return allPlaces({ month, lang });
}

/** Places of one kind (`beach`, `hill`, …), best first. */
export async function placesByKind(kind: string, lang: Lang = "bn"): Promise<PlaceSummary[]> {
  return allPlaces({ kind, lang });
}

/** The full place guide, or null for an unknown slug. */
export async function getPlace(slug: string, lang: Lang = "bn"): Promise<PlaceDetail | null> {
  const db = getDb();
  const row = selectPlaces(db).where(eq(places.slug, slug)).get();
  if (!row) return null;
  const { p } = row;

  let fromDhaka: FromDhaka | null = null;
  if (p.fromDhaka) {
    const route = db
      .select({ slug: routes.slug })
      .from(routes)
      .where(eq(routes.slug, `dhaka-to-${row.d.slug}`))
      .get();
    fromDhaka = {
      roadKm: p.fromDhaka.road_km,
      busHours: p.fromDhaka.bus_hours,
      busFareFromBdt: p.fromDhaka.bus_fare_from_bdt,
      directTrains: p.fromDhaka.direct_trains,
      routeSlug: route?.slug ?? null,
    };
  }

  return {
    ...toPlaceSummary(row, lang),
    howToGetThere: pick(lang, p.howToGetThereBn, p.howToGetThereEn),
    warnings: pick(lang, p.warningsBn, p.warningsEn) ?? [],
    tips: pick(lang, p.tipsBn, p.tipsEn) ?? [],
    accessibility: pick(lang, p.accessibilityBn, p.accessibilityEn),
    entryFee: pick(lang, p.entryFeeBn, p.entryFeeEn),
    openingHours: pick(lang, p.openingHoursBn, p.openingHoursEn),
    photo: p.photo,
    fromDhaka,
    nearby: placeSummariesBySlug(db, p.nearby, lang),
  };
}

/** Places nearest to a point (haversine), optionally of one kind. Places without coordinates are skipped. */
export async function nearby(
  lat: number,
  lng: number,
  limit = 10,
  kind?: string | null,
  lang: Lang = "bn",
): Promise<NearbyPlace[]> {
  const db = getDb();
  const rows = selectPlaces(db)
    .where(
      and(isNotNull(places.lat), isNotNull(places.lng), kind ? eq(places.kind, kind) : undefined),
    )
    .all();
  return rows
    .map((r) => ({
      ...toPlaceSummary(r, lang),
      distanceKm: haversineKm(lat, lng, r.p.lat!, r.p.lng!),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.id - b.id)
    .slice(0, Math.max(0, limit));
}

/** Lightweight map points for every place with coordinates. */
export async function listPlacePoints(lang: Lang = "bn"): Promise<PlacePoint[]> {
  const db = getDb();
  return db
    .select({
      slug: places.slug,
      nameBn: places.nameBn,
      nameEn: places.nameEn,
      kind: places.kind,
      districtId: places.districtId,
      lat: places.lat,
      lng: places.lng,
      unseen: places.unseen,
    })
    .from(places)
    .where(and(isNotNull(places.lat), isNotNull(places.lng)))
    .orderBy(asc(places.id))
    .all()
    .map((p) => ({
      slug: p.slug,
      name: lang === "bn" ? p.nameBn : p.nameEn,
      kind: p.kind,
      districtId: p.districtId,
      lat: p.lat!,
      lng: p.lng!,
      unseen: p.unseen,
    }));
}
