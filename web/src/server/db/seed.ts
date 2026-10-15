/**
 * Builds the content tables from `data/*.json`, the bilingual prose in `data/content/*.json` and
 * `assets/places/index.json`.
 *
 * Idempotent: every run replaces the content tables inside one transaction and leaves the user
 * tables alone. Ids come from the data files, so rows that users point at (visited districts,
 * wishlisted places) keep their ids across reseeds.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import { MONTHS } from "@/lib/months";
import { assetsDir, photosDir, seedDataDir } from "../paths";
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

/** Original prose, one entry per place or district (`data/content/*.json`). */
type ContentEntry<T> = { slug: string; reviewed: boolean; bn: T; en: T };
type RawPlaceText = {
  description: string;
  how_to_get_there: string;
  tips: string[];
  warnings: string[];
};
type RawDistrictText = { intro: string; how_to_reach: string };

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
  placeTexts: number;
  districtTexts: number;
};

export type SeedOptions = { dataDir?: string; assetsDir?: string; photosDir?: string };

/** One credited Commons photo (`data/content/photos.json`). */
type RawPhoto = {
  slug: string;
  file: string;
  author: string;
  license: string;
  license_url: string;
  source: string;
};

/**
 * Credited photos by place slug. A photo counts only when `photos.json` lists it and both WebP
 * sizes are on disk (they are fetched, not committed), so a fresh checkout shows the illustrated
 * covers until `npm run photos` has run.
 */
function readPhotos(dataDir: string, photos: string): Map<string, RawPhoto> {
  const path = join(dataDir, "content", "photos.json");
  const out = new Map<string, RawPhoto>();
  if (!existsSync(path)) return out;
  for (const entry of JSON.parse(readFileSync(path, "utf8")) as RawPhoto[]) {
    const present = ["w640", "w1200"].every((w) => existsSync(join(photos, w, entry.file)));
    if (present) out.set(entry.slug, entry);
  }
  return out;
}

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), "utf8")) as T;
}

/**
 * Read `data/content/{file}` into a map by slug. A missing file gives an empty map (the prose
 * columns stay null); an entry for a slug that does not exist is an error.
 */
function readContent<T>(
  dataDir: string,
  file: string,
  slugs: ReadonlySet<string>,
): Map<string, ContentEntry<T>> {
  const path = join(dataDir, "content", file);
  if (!existsSync(path)) return new Map();
  const entries = JSON.parse(readFileSync(path, "utf8")) as ContentEntry<T>[];
  const bySlug = new Map<string, ContentEntry<T>>();
  for (const entry of entries) {
    if (!slugs.has(entry.slug))
      throw new Error(`seed: content/${file} has unknown slug "${entry.slug}"`);
    if (bySlug.has(entry.slug)) throw new Error(`seed: content/${file} repeats "${entry.slug}"`);
    bySlug.set(entry.slug, entry);
  }
  return bySlug;
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
  const photoFiles = readPhotos(dataDir, options.photosDir ?? photosDir());

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
  const districtText = readContent<RawDistrictText>(
    dataDir,
    "districts.json",
    new Set(rawDistricts.map((d) => d.slug)),
  );
  const placeText = readContent<RawPlaceText>(
    dataDir,
    "places.json",
    new Set(rawPlaces.map((p) => p.slug)),
  );

  /* Divisions, ordered by their lowest district id (Dhaka 1, Chattogram 14, Sylhet 25, …). */
  const divisionRows = [...rawDivisions]
    .sort((a, b) => Math.min(...a.district_ids) - Math.min(...b.district_ids))
    .map((d, i) => ({ slug: d.slug, nameBn: d.name_bn, nameEn: d.name_en, position: i + 1 }));

  const districtRows = rawDistricts.map((d) => {
    const text = districtText.get(d.slug);
    return {
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
      introBn: text?.bn.intro ?? null,
      introEn: text?.en.intro ?? null,
      howToReachBn: text?.bn.how_to_reach ?? null,
      howToReachEn: text?.en.how_to_reach ?? null,
    };
  });
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
    const text = placeText.get(p.slug);
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
      photo: photoFiles.has(p.slug)
        ? {
            src: `/photos/w1200/${photoFiles.get(p.slug)!.file}`,
            w640: `/photos/w640/${photoFiles.get(p.slug)!.file}`,
            author: photoFiles.get(p.slug)!.author,
            license: photoFiles.get(p.slug)!.license,
            license_url: photoFiles.get(p.slug)!.license_url,
            source: photoFiles.get(p.slug)!.source,
          }
        : null,
      nearby: p.nearby,
      fromDhaka: p.from_dhaka,
      descriptionBn: text?.bn.description ?? null,
      descriptionEn: text?.en.description ?? null,
      howToGetThereBn: text?.bn.how_to_get_there ?? null,
      howToGetThereEn: text?.en.how_to_get_there ?? null,
      tipsBn: text?.bn.tips ?? null,
      tipsEn: text?.en.tips ?? null,
      warningsBn: text?.bn.warnings ?? null,
      warningsEn: text?.en.warnings ?? null,
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
      // Editorial star overrides set in the admin survive a re-seed.
      sqlite
        .prepare(
          `UPDATE places SET stars = (SELECT stars FROM place_stars ps WHERE ps.place_id = places.id)
           WHERE id IN (SELECT place_id FROM place_stars)`,
        )
        .run();
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
    placeTexts: placeText.size,
    districtTexts: districtText.size,
  };
}
