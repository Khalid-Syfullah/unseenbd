import { asc, count, eq } from "drizzle-orm";
import { haversineKm } from "@/lib/geo";
import { getDb } from "../db/client";
import { districts, divisions, places, routes, routesFromDhaka } from "../db/schema";
import { pick, type Lang } from "./lang";
import { selectPlaces, toDistrictRef, toDivisionRef, toPlaceSummary } from "./shared";
import type {
  DistrictDetail,
  DistrictListItem,
  DistrictRef,
  DivisionRef,
  DivisionWithDistricts,
  FamousEntry,
} from "./types";

function placeCounts(): Map<number, number> {
  const db = getDb();
  const rows = db
    .select({ districtId: places.districtId, n: count() })
    .from(places)
    .groupBy(places.districtId)
    .all();
  return new Map(rows.map((r) => [r.districtId, r.n]));
}

/** All 64 districts, by id, with place counts. */
export async function listDistricts(lang: Lang = "bn"): Promise<DistrictListItem[]> {
  const db = getDb();
  const counts = placeCounts();
  return db
    .select()
    .from(districts)
    .orderBy(asc(districts.id))
    .all()
    .map((d) => ({
      ...toDistrictRef(d, lang),
      lat: d.lat,
      lng: d.lng,
      placeCount: counts.get(d.id) ?? 0,
    }));
}

/** The 8 divisions in display order, without their districts. */
export async function listDivisions(
  lang: Lang = "bn",
): Promise<(DivisionRef & { position: number })[]> {
  const db = getDb();
  return db
    .select()
    .from(divisions)
    .orderBy(asc(divisions.position))
    .all()
    .map((d) => ({ ...toDivisionRef(d, lang), position: d.position }));
}

/** The 8 divisions in display order, each with its districts (by id). */
export async function listDistrictsByDivision(lang: Lang = "bn"): Promise<DivisionWithDistricts[]> {
  const [divs, all] = await Promise.all([listDivisions(lang), listDistricts(lang)]);
  return divs.map((dv) => ({
    ...dv,
    districts: all.filter((d) => d.division === dv.slug),
  }));
}

/** The district guide, or null for an unknown slug. */
export async function getDistrict(slug: string, lang: Lang = "bn"): Promise<DistrictDetail | null> {
  const db = getDb();
  const row = db
    .select({ d: districts, dv: divisions })
    .from(districts)
    .innerJoin(divisions, eq(districts.division, divisions.slug))
    .where(eq(districts.slug, slug))
    .get();
  if (!row) return null;
  const { d, dv } = row;

  const placeRows = selectPlaces(db)
    .where(eq(places.districtId, d.id))
    .orderBy(asc(places.districtPosition), asc(places.id))
    .all();

  const dhaka = db
    .select()
    .from(routesFromDhaka)
    .where(eq(routesFromDhaka.toDistrictId, d.id))
    .get();
  const dhakaRoute = dhaka
    ? db
        .select({ slug: routes.slug })
        .from(routes)
        .where(eq(routes.slug, `dhaka-to-${d.slug}`))
        .get()
    : undefined;

  const others = db.select().from(districts).all();
  const nearbyDistricts = others
    .filter((o) => o.id !== d.id)
    .map((o) => ({
      ...toDistrictRef(o, lang),
      distanceKm: haversineKm(d.lat, d.lng, o.lat, o.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6);

  return {
    ...toDistrictRef(d, lang),
    lat: d.lat,
    lng: d.lng,
    placeCount: placeRows.length,
    divisionRef: toDivisionRef(dv, lang),
    famousFor: (lang === "bn" ? d.famousForBn : d.famousForEn) ?? [],
    intro: pick(lang, d.introBn, d.introEn),
    howToReach: pick(lang, d.howToReachBn, d.howToReachEn),
    communityPhotoCount: d.communityPhotoCount,
    places: placeRows.map((r) => toPlaceSummary(r, lang)),
    fromDhaka: dhaka
      ? {
          roadKm: dhaka.roadKm,
          busHours: dhaka.busHours,
          busFareFromBdt: dhaka.busFareFromBdt,
          directTrains: dhaka.directTrains,
          routeSlug: dhakaRoute?.slug ?? null,
        }
      : null,
    nearbyDistricts,
  };
}

/** A district reference by slug or id, or null. */
export async function getDistrictRef(
  slugOrId: string | number,
  lang: Lang = "bn",
): Promise<DistrictRef | null> {
  const db = getDb();
  const row = db
    .select()
    .from(districts)
    .where(typeof slugOrId === "number" ? eq(districts.id, slugOrId) : eq(districts.slug, slugOrId))
    .get();
  return row ? toDistrictRef(row, lang) : null;
}

/** Famous foods and crafts of every district (`famous_for_*`), by district id. */
export async function listFamous(lang: Lang = "bn"): Promise<FamousEntry[]> {
  const db = getDb();
  return db
    .select()
    .from(districts)
    .orderBy(asc(districts.id))
    .all()
    .map((d) => ({
      district: toDistrictRef(d, lang),
      items: lang === "bn" ? d.famousForBn : d.famousForEn,
    }));
}
