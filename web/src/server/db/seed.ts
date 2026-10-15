/**
 * Builds the content tables from `data/*.json` and `assets/places/index.json`.
 *
 * Idempotent: every run replaces the content tables inside one transaction and leaves the user
 * tables alone. Ids come from the data files, so rows that users point at (visited districts,
 * wishlisted places) keep their ids across reseeds.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import { MONTHS } from "@/lib/months";
import { assetsDir, seedDataDir } from "../paths";
import type {
  ImageCredit,
  PlaceFromDhaka,
  RouteBus,
  RouteFlight,
  RouteWater,
  TrainClass,
} from "./json-types";
import * as schema from "./schema";

type SeedDb = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

/* Raw seed-file shapes ---------------------------------------------------------------------- */

type RawDivision = { slug: string; name_bn: string; name_en: string; district_ids: number[] };
type RawDistrict = {
  id: number;
  slug: string;
  name_bn: string;
  name_en: string;
  division: string;
  lat: number;
  lng: number;
  famous_for_bn: string[];
  famous_for_en: string[];
  places: string[];
  community_photo_count?: number;
};
type RawKind = { key: string; label_bn: string; label_en: string; places: string[] };
type RawPlace = {
  id: number;
  slug: string;
  name_bn: string;
  name_en: string;
  district_id: number;
  kind: string;
  popular: boolean;
  unseen: boolean;
  best_from_month: number;
  best_to_month: number;
  visit_hours: number;
  lat: number | null;
  lng: number | null;
  stars: number;
  image_credit: ImageCredit | null;
  nearby: string[];
  from_dhaka: PlaceFromDhaka | null;
};
type RawCover = {
  slug: string;
  scene: string;
  variant: string;
  mood: string;
  svg: string;
  w640: string;
  w1200: string;
};
type RawRoute = {
  slug: string;
  from: string;
  to: string;
  road_km: number;
  bus: RouteBus | null;
  trains: string[];
  trains_back: string[];
  water: RouteWater[];
  water_en: RouteWater[];
  flight: RouteFlight | null;
  flight_en: RouteFlight | null;
  places_at_destination: string[];
};
type RawDhakaSummary = {
  to_district_id: number;
  road_km: number;
  bus_hours: [number, number] | null;
  bus_fare_from_bdt: number | null;
  direct_trains: number;
};
type RawTrain = {
  no: number;
  slug: string;
  name_bn: string;
  name_en: string;
  off_day: number | null;
  from_bn: string;
  from_en: string;
  from_district_id: number;
  to_bn: string;
  to_en: string;
  to_district_id: number;
  dep: string;
  arr: string;
  minutes: number;
  stops: {
    station: string;
    station_en: string;
    districtId: number | null;
    arr: string | null;
    dep: string | null;
    minutes: number | null;
  }[];
  fares: { from: string; to: string; cls: TrainClass; fare: number }[];
  classes: TrainClass[] | null;
  timetable: string | null;
  confidence: string;
  as_of: string;
  sources: string[];
  return_train: string | null;
};
type RawCuration = {
  popular_24: string[];
  unseen: string[];
  trending_snapshot: {
    month: number;
    items: { slug: string; votes: number; likes: number; comments: number; stars: number }[];
  };
};
type RawDirectoryItem = {
  name: string;
  category_bn?: string;
  area_bn?: string;
  rating?: number;
  reviews?: number;
};

export type SeedCounts = {
  divisions: number;
  districts: number;
  kinds: number;
  months: number;
  places: number;
  routes: number;
  routesFromDhaka: number;
  trains: number;
  trainStops: number;
  trainFares: number;
  curation: number;
  directory: number;
  reference: number;
};

export type SeedOptions = { dataDir?: string; assetsDir?: string };

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), "utf8")) as T;
}

/** Insert in chunks to stay well under SQLite's bound-parameter limit. */
function insertAll<T extends Parameters<SeedDb["insert"]>[0]>(
  tx: Pick<SeedDb, "insert">,
  table: T,
  rows: T["$inferInsert"][],
  chunk = 200,
) {
  for (let i = 0; i < rows.length; i += chunk) {
    tx.insert(table)
      .values(rows.slice(i, i + chunk))
      .run();
  }
}

/** Replace all content tables with the data in `data/`. Returns the row counts. */
export function seedDatabase(db: SeedDb, options: SeedOptions = {}): SeedCounts {
  const dataDir = options.dataDir ?? seedDataDir();
  const assets = options.assetsDir ?? assetsDir();

  const rawDivisions = readJson<RawDivision[]>(dataDir, "divisions.json");
  const rawDistricts = readJson<RawDistrict[]>(dataDir, "districts.json");
  const rawKinds = readJson<RawKind[]>(dataDir, "kinds.json");
  const rawPlaces = readJson<RawPlace[]>(dataDir, "places.json");
  const rawRoutes = readJson<RawRoute[]>(dataDir, "routes.json");
  const rawDhaka = readJson<RawDhakaSummary[]>(dataDir, "routes_from_dhaka.json");
  const rawTrains = readJson<RawTrain[]>(dataDir, "trains.json");
  const rawCuration = readJson<RawCuration>(dataDir, "curation.json");
  const rawDirectory = readJson<Record<string, unknown>>(dataDir, "directory_snapshot.json");
  const rawReference = readJson<Record<string, unknown>>(dataDir, "reference.json");
  const rawCovers = readJson<RawCover[]>(join(assets, "places"), "index.json");

  /* Divisions, ordered by their lowest district id (Dhaka 1, Chattogram 14, Sylhet 25, …). */
  const divisionRows = [...rawDivisions]
    .sort((a, b) => Math.min(...a.district_ids) - Math.min(...b.district_ids))
    .map((d, i) => ({ slug: d.slug, nameBn: d.name_bn, nameEn: d.name_en, position: i + 1 }));

  const districtRows = rawDistricts.map((d) => ({
    id: d.id,
    slug: d.slug,
    nameBn: d.name_bn,
    nameEn: d.name_en,
    division: d.division,
    lat: d.lat,
    lng: d.lng,
    famousForBn: d.famous_for_bn,
    famousForEn: d.famous_for_en,
    communityPhotoCount: d.community_photo_count ?? 0,
  }));
  const districtIdBySlug = new Map(rawDistricts.map((d) => [d.slug, d.id]));
  const districtPosition = new Map<string, number>();
  for (const d of rawDistricts) d.places.forEach((slug, i) => districtPosition.set(slug, i + 1));

  const kindRows = rawKinds.map((k, i) => ({
    key: k.key,
    labelBn: k.label_bn,
    labelEn: k.label_en,
    position: i + 1,
  }));

  const monthRows = MONTHS.map((m) => ({ ...m }));

  const coverBySlug = new Map(rawCovers.map((c) => [c.slug, c]));
  const placeRows = rawPlaces.map((p) => {
    const c = coverBySlug.get(p.slug);
    return {
      id: p.id,
      slug: p.slug,
      nameBn: p.name_bn,
      nameEn: p.name_en,
      districtId: p.district_id,
      districtPosition: districtPosition.get(p.slug) ?? 0,
      kind: p.kind,
      popular: p.popular,
      unseen: p.unseen,
      bestFromMonth: p.best_from_month,
      bestToMonth: p.best_to_month,
      visitHours: p.visit_hours,
      lat: p.lat,
      lng: p.lng,
      stars: p.stars,
      imageCredit: p.image_credit,
      cover: c
        ? {
            svg: `/places/${c.svg}`,
            w640: `/places/${c.w640}`,
            w1200: `/places/${c.w1200}`,
            scene: c.scene,
            variant: c.variant,
            mood: c.mood,
          }
        : null,
      photo: null,
      nearby: p.nearby,
      fromDhaka: p.from_dhaka,
    };
  });

  const districtId = (slug: string) => {
    const id = districtIdBySlug.get(slug);
    if (id === undefined) throw new Error(`seed: unknown district slug "${slug}"`);
    return id;
  };
  const routeRows = rawRoutes.map((r) => ({
    slug: r.slug,
    fromDistrictId: districtId(r.from),
    toDistrictId: districtId(r.to),
    roadKm: r.road_km,
    bus: r.bus,
    trains: r.trains,
    trainsBack: r.trains_back,
    waterBn: r.water,
    waterEn: r.water_en,
    flightBn: r.flight,
    flightEn: r.flight_en,
    placesAtDestination: r.places_at_destination,
  }));

  const dhakaRows = rawDhaka.map((r) => ({
    toDistrictId: r.to_district_id,
    roadKm: r.road_km,
    busHours: r.bus_hours,
    busFareFromBdt: r.bus_fare_from_bdt,
    directTrains: r.direct_trains,
  }));

  const trainRows = rawTrains.map((t) => ({
    slug: t.slug,
    no: t.no,
    nameBn: t.name_bn,
    nameEn: t.name_en,
    offDay: t.off_day,
    fromBn: t.from_bn,
    fromEn: t.from_en,
    fromDistrictId: t.from_district_id,
    toBn: t.to_bn,
    toEn: t.to_en,
    toDistrictId: t.to_district_id,
    dep: t.dep,
    arr: t.arr,
    minutes: t.minutes,
    classes: t.classes,
    timetable: t.timetable,
    confidence: t.confidence,
    asOf: t.as_of,
    sources: t.sources,
    returnTrain: t.return_train,
  }));
  const stopRows = rawTrains.flatMap((t) =>
    t.stops.map((s, i) => ({
      trainSlug: t.slug,
      position: i + 1,
      stationBn: s.station,
      stationEn: s.station_en,
      districtId: s.districtId,
      arr: s.arr,
      dep: s.dep,
      minutes: s.minutes,
    })),
  );
  const fareRows = rawTrains.flatMap((t) =>
    t.fares.map((f, i) => ({
      trainSlug: t.slug,
      position: i + 1,
      fromStation: f.from,
      toStation: f.to,
      cls: f.cls,
      fare: f.fare,
    })),
  );

  const curationRows: (typeof schema.curation.$inferInsert)[] = [
    ...rawCuration.popular_24.map((slug, i) => ({
      list: "popular" as const,
      position: i + 1,
      placeSlug: slug,
    })),
    ...rawCuration.unseen.map((slug, i) => ({
      list: "unseen" as const,
      position: i + 1,
      placeSlug: slug,
    })),
    ...rawCuration.trending_snapshot.items.map((t, i) => ({
      list: "trending" as const,
      position: i + 1,
      placeSlug: t.slug,
      votes: t.votes,
      likes: t.likes,
      comments: t.comments,
      stars: t.stars,
      month: rawCuration.trending_snapshot.month,
    })),
  ];

  const directoryRows = (["hotels", "resorts", "restaurants", "shopping"] as const).flatMap(
    (section) =>
      ((rawDirectory[section] as RawDirectoryItem[] | undefined) ?? []).map((item, i) => ({
        section,
        position: i + 1,
        name: item.name,
        categoryBn: item.category_bn ?? null,
        areaBn: item.area_bn ?? null,
        rating: item.rating ?? null,
        reviews: item.reviews ?? null,
      })),
  );

  const referenceRows = Object.entries(rawReference).map(([key, value]) => ({ key, value }));

  /* Write ---------------------------------------------------------------------------------- */
  const sqlite = db.$client;
  // Foreign keys are switched off while the content tables are swapped (user rows keep pointing
  // at the same ids) and checked as a whole before committing.
  sqlite.pragma("foreign_keys = OFF");
  try {
    db.transaction((tx) => {
      for (const table of [...schema.CONTENT_TABLES].reverse()) {
        sqlite.prepare(`DELETE FROM "${table}"`).run();
      }
      insertAll(tx, schema.divisions, divisionRows);
      insertAll(tx, schema.districts, districtRows);
      insertAll(tx, schema.kinds, kindRows);
      insertAll(tx, schema.months, monthRows);
      insertAll(tx, schema.places, placeRows);
      insertAll(tx, schema.routes, routeRows);
      insertAll(tx, schema.routesFromDhaka, dhakaRows);
      insertAll(tx, schema.trains, trainRows);
      insertAll(tx, schema.trainStops, stopRows);
      insertAll(tx, schema.trainFares, fareRows);
      insertAll(tx, schema.curation, curationRows);
      insertAll(tx, schema.directory, directoryRows);
      insertAll(tx, schema.reference, referenceRows);

      const problems = sqlite.prepare("PRAGMA foreign_key_check").all();
      if (problems.length > 0) {
        throw new Error(
          `seed: ${problems.length} foreign-key problems, first: ${JSON.stringify(problems[0])}`,
        );
      }
    });
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }

  return {
    divisions: divisionRows.length,
    districts: districtRows.length,
    kinds: kindRows.length,
    months: monthRows.length,
    places: placeRows.length,
    routes: routeRows.length,
    routesFromDhaka: dhakaRows.length,
    trains: trainRows.length,
    trainStops: stopRows.length,
    trainFares: fareRows.length,
    curation: curationRows.length,
    directory: directoryRows.length,
    reference: referenceRows.length,
  };
}
