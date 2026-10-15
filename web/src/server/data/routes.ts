import { aliasedTable, and, asc, eq } from "drizzle-orm";
import { estimateLegKm } from "@/lib/planner/distance";
import { getDb } from "../db/client";
import type { RouteBus } from "../db/json-types";
import { districts, divisions, places, reference, routes, routesFromDhaka } from "../db/schema";
import type { Lang } from "./lang";
import {
  placeSummariesBySlug,
  selectPlaces,
  toDistrictRef,
  toDivisionRef,
  toPlaceSummary,
} from "./shared";
import { trainSummaries } from "./trains";
import type {
  BookingLinks,
  BusInfo,
  ComputedRoute,
  DhakaRouteSummary,
  RouteDetail,
  RouteSummary,
} from "./types";

const fromD = aliasedTable(districts, "from_d");
const toD = aliasedTable(districts, "to_d");

function selectRoutes() {
  return getDb()
    .select({ r: routes, from: fromD, to: toD })
    .from(routes)
    .innerJoin(fromD, eq(routes.fromDistrictId, fromD.id))
    .innerJoin(toD, eq(routes.toDistrictId, toD.id));
}

function toBusInfo(bus: RouteBus, lang: Lang): BusInfo {
  const en = lang === "en";
  return {
    km: bus.km,
    hours: bus.hours,
    terminals: en && bus.terminals_en.length ? bus.terminals_en : bus.terminals,
    arrives: en ? (bus.arrives_en ?? bus.arrives) : bus.arrives,
    chart: bus.chart,
    nonAc: bus.nonAc,
    ac: bus.ac,
    operators: bus.operators.map((o, i) => ({
      name: en ? (bus.operators_en[i] ?? o.name) : o.name,
      ac: o.ac,
    })),
    confidence: bus.confidence,
    asOf: bus.asOf,
    sources: bus.sources,
  };
}

/** Every detailed route (150), ordered by origin then destination id. */
export async function listRoutes(lang: Lang = "bn"): Promise<RouteSummary[]> {
  return selectRoutes()
    .orderBy(asc(routes.fromDistrictId), asc(routes.toDistrictId))
    .all()
    .map(({ r, from, to }) => ({
      slug: r.slug,
      from: toDistrictRef(from, lang),
      to: toDistrictRef(to, lang),
      roadKm: r.roadKm,
    }));
}

/** The slug of the detailed route between two districts (by slug), or null. */
export async function findRouteSlug(fromSlug: string, toSlug: string): Promise<string | null> {
  const row = selectRoutes()
    .where(and(eq(fromD.slug, fromSlug), eq(toD.slug, toSlug)))
    .get();
  return row?.r.slug ?? null;
}

/** A route page: bus, trains both ways, launches, flights and places at the destination. */
export async function getRoute(slug: string, lang: Lang = "bn"): Promise<RouteDetail | null> {
  const row = selectRoutes().where(eq(routes.slug, slug)).get();
  if (!row) return null;
  const { r, from, to } = row;
  const db = getDb();

  const reverse = db
    .select({ slug: routes.slug })
    .from(routes)
    .where(
      and(eq(routes.fromDistrictId, r.toDistrictId), eq(routes.toDistrictId, r.fromDistrictId)),
    )
    .get();

  const byOrder = (slugs: string[]) => {
    const found = new Map(trainSummaries(lang, slugs).map((t) => [t.slug, t]));
    return slugs.flatMap((s) => found.get(s) ?? []);
  };

  return {
    slug: r.slug,
    from: toDistrictRef(from, lang),
    to: toDistrictRef(to, lang),
    roadKm: r.roadKm,
    bus: r.bus ? toBusInfo(r.bus, lang) : null,
    trains: byOrder(r.trains),
    trainsBack: byOrder(r.trainsBack),
    water: lang === "bn" ? r.waterBn : r.waterEn.length ? r.waterEn : r.waterBn,
    flight: lang === "bn" ? r.flightBn : (r.flightEn ?? r.flightBn),
    placesAtDestination: placeSummariesBySlug(db, r.placesAtDestination, lang),
    reverseSlug: reverse?.slug ?? null,
  };
}

/** Dhaka → the other 63 districts: distance, bus time, cheapest bus fare and direct trains. */
export async function listRoutesFromDhaka(lang: Lang = "bn"): Promise<DhakaRouteSummary[]> {
  const db = getDb();
  const rows = db
    .select({ s: routesFromDhaka, d: districts, dv: divisions })
    .from(routesFromDhaka)
    .innerJoin(districts, eq(routesFromDhaka.toDistrictId, districts.id))
    .innerJoin(divisions, eq(districts.division, divisions.slug))
    .orderBy(asc(divisions.position), asc(districts.id))
    .all();
  const routeSlugs = new Set(
    db
      .select({ slug: routes.slug })
      .from(routes)
      .all()
      .map((r) => r.slug),
  );
  return rows.map(({ s, d, dv }) => {
    const slug = `dhaka-to-${d.slug}`;
    return {
      district: toDistrictRef(d, lang),
      divisionRef: toDivisionRef(dv, lang),
      roadKm: s.roadKm,
      busHours: s.busHours,
      busFareFromBdt: s.busFareFromBdt,
      directTrains: s.directTrains,
      routeSlug: routeSlugs.has(slug) ? slug : null,
    };
  });
}

const DEFAULT_BOOKING: BookingLinks = {
  train: "https://eticket.railway.gov.bd/",
  bus: { name: "Shohoz", url: "https://www.shohoz.com/bus-tickets" },
  air: [],
};

/** Where to buy tickets: the railway e-ticket site, a bus ticket site and the airlines. */
export async function getBookingLinks(): Promise<BookingLinks> {
  const row = getDb().select().from(reference).where(eq(reference.key, "booking_links")).get();
  const v = (row?.value ?? {}) as Partial<BookingLinks>;
  return {
    train: v.train ?? DEFAULT_BOOKING.train,
    bus: v.bus ?? DEFAULT_BOOKING.bus,
    air: v.air ?? DEFAULT_BOOKING.air,
  };
}

/** Splits `a-to-b` into two different district slugs (slugs contain hyphens, so try each `-to-`). */
function parsePair(slug: string, known: Set<string>): [string, string] | null {
  let at = slug.indexOf("-to-");
  while (at !== -1) {
    const a = slug.slice(0, at);
    const b = slug.slice(at + 4);
    if (a !== b && known.has(a) && known.has(b)) return [a, b];
    at = slug.indexOf("-to-", at + 1);
  }
  return null;
}

/**
 * A route page for any two districts that has no curated guide: estimated road distance, direct
 * trains each way (a train whose stops include both districts in the right order) and places at
 * the destination. Null when the slug is not `district-to-district`.
 */
export async function getComputedRoute(
  slug: string,
  lang: Lang = "bn",
): Promise<ComputedRoute | null> {
  const db = getDb();
  const rows = db.select().from(districts).all();
  const bySlug = new Map(rows.map((d) => [d.slug, d]));
  const pair = parsePair(slug, new Set(bySlug.keys()));
  if (!pair) return null;
  const from = bySlug.get(pair[0])!;
  const to = bySlug.get(pair[1])!;

  const all = trainSummaries(lang);
  const direct = (a: number, b: number) =>
    all.filter((t) => {
      const i = t.districtIds.indexOf(a);
      const j = t.districtIds.indexOf(b);
      return i !== -1 && j !== -1 && i < j;
    });

  const dhaka =
    from.slug === "dhaka"
      ? db.select().from(routesFromDhaka).where(eq(routesFromDhaka.toDistrictId, to.id)).get()
      : undefined;

  const placeRows = selectPlaces(db)
    .where(eq(places.districtId, to.id))
    .orderBy(asc(places.districtPosition), asc(places.id))
    .limit(6)
    .all();

  return {
    slug,
    from: toDistrictRef(from, lang),
    to: toDistrictRef(to, lang),
    roadKm: dhaka?.roadKm ?? estimateLegKm(from, to),
    estimated: !dhaka,
    busHours: dhaka?.busHours ?? null,
    busFareFromBdt: dhaka?.busFareFromBdt ?? null,
    trains: direct(from.id, to.id),
    trainsBack: direct(to.id, from.id),
    placesAtDestination: placeRows.map((r) => toPlaceSummary(r, lang)),
  };
}
