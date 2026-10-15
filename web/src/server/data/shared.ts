import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";
import { districts, divisions, kinds, places } from "../db/schema";
import { pick, type Lang } from "./lang";
import type { DistrictRef, DivisionRef, KindRef, PlaceSummary } from "./types";

type DistrictRow = typeof districts.$inferSelect;
type DivisionRow = typeof divisions.$inferSelect;
type KindRow = typeof kinds.$inferSelect;
type PlaceRow = typeof places.$inferSelect;

export const nameIn = (lang: Lang, row: { nameBn: string; nameEn: string }) =>
  lang === "bn" ? row.nameBn : row.nameEn;

export function toDistrictRef(row: DistrictRow, lang: Lang): DistrictRef {
  return {
    id: row.id,
    slug: row.slug,
    name: nameIn(lang, row),
    nameBn: row.nameBn,
    nameEn: row.nameEn,
    division: row.division,
  };
}

export function toDivisionRef(row: DivisionRow, lang: Lang): DivisionRef {
  return { slug: row.slug, name: nameIn(lang, row), nameBn: row.nameBn, nameEn: row.nameEn };
}

export function toKindRef(row: KindRow, lang: Lang): KindRef {
  return {
    key: row.key,
    label: lang === "bn" ? row.labelBn : row.labelEn,
    labelBn: row.labelBn,
    labelEn: row.labelEn,
  };
}

export type PlaceJoinRow = { p: PlaceRow; d: DistrictRow; dv: DivisionRow; k: KindRow };

/** Places joined with their district, division and kind; add `.where()` / `.orderBy()`. */
export function selectPlaces(db: Db) {
  return db
    .select({ p: places, d: districts, dv: divisions, k: kinds })
    .from(places)
    .innerJoin(districts, eq(places.districtId, districts.id))
    .innerJoin(divisions, eq(districts.division, divisions.slug))
    .innerJoin(kinds, eq(places.kind, kinds.key));
}

export function toPlaceSummary(row: PlaceJoinRow, lang: Lang): PlaceSummary {
  const { p } = row;
  return {
    id: p.id,
    slug: p.slug,
    name: nameIn(lang, p),
    nameBn: p.nameBn,
    nameEn: p.nameEn,
    district: toDistrictRef(row.d, lang),
    division: toDivisionRef(row.dv, lang),
    kind: toKindRef(row.k, lang),
    popular: p.popular,
    unseen: p.unseen,
    bestFromMonth: p.bestFromMonth,
    bestToMonth: p.bestToMonth,
    visitHours: p.visitHours,
    lat: p.lat,
    lng: p.lng,
    stars: p.stars,
    // A real photo replaces the illustration wherever a cover is shown.
    cover: p.photo && p.cover ? { ...p.cover, w640: p.photo.w640, w1200: p.photo.src } : p.cover,
    photo: p.photo,
    imageCredit: p.imageCredit,
    description: pick(lang, p.descriptionBn, p.descriptionEn),
  };
}

/** Summaries for `slugs`, in the order given (unknown slugs are skipped). */
export function placeSummariesBySlug(db: Db, slugs: string[], lang: Lang): PlaceSummary[] {
  if (slugs.length === 0) return [];
  const rows = selectPlaces(db).where(inArray(places.slug, slugs)).all();
  const bySlug = new Map(rows.map((r) => [r.p.slug, r]));
  return slugs.flatMap((s) => {
    const r = bySlug.get(s);
    return r ? [toPlaceSummary(r, lang)] : [];
  });
}
