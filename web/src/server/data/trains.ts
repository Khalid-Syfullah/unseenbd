import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { TRAIN_CLASSES, type Confidence, type TrainClass } from "../db/json-types";
import { districts, trainFares, trainStops, trains } from "../db/schema";
import type { Lang } from "./lang";
import { nameIn, toDistrictRef } from "./shared";
import type { TrainDetail, TrainSummary } from "./types";

type TrainRow = typeof trains.$inferSelect;
type StopRow = typeof trainStops.$inferSelect;

function classesOf(row: TrainRow, fares: { cls: TrainClass }[]): TrainClass[] {
  const present = new Set<TrainClass>([...(row.classes ?? []), ...fares.map((f) => f.cls)]);
  return TRAIN_CLASSES.filter((c) => present.has(c));
}

function toSummary(
  row: TrainRow,
  stops: StopRow[],
  fares: { cls: TrainClass }[],
  lang: Lang,
): TrainSummary {
  return {
    slug: row.slug,
    no: row.no,
    name: nameIn(lang, row),
    nameBn: row.nameBn,
    nameEn: row.nameEn,
    from: { station: lang === "bn" ? row.fromBn : row.fromEn, districtId: row.fromDistrictId },
    to: { station: lang === "bn" ? row.toBn : row.toEn, districtId: row.toDistrictId },
    dep: row.dep,
    arr: row.arr,
    minutes: row.minutes,
    offDay: row.offDay,
    classes: classesOf(row, fares),
    stations: stops.map((s) => (lang === "bn" ? s.stationBn : s.stationEn)),
    districtIds: [...new Set(stops.flatMap((s) => (s.districtId === null ? [] : [s.districtId])))],
    confidence: row.confidence as Confidence,
    asOf: row.asOf,
    sources: row.sources,
  };
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

/** Summaries for the given train slugs (all trains when omitted), ordered by train number. */
export function trainSummaries(lang: Lang, slugs?: string[]): TrainSummary[] {
  if (slugs && slugs.length === 0) return [];
  const db = getDb();
  const rows = db
    .select()
    .from(trains)
    .where(slugs ? inArray(trains.slug, slugs) : undefined)
    .orderBy(asc(trains.no))
    .all();
  const stops = groupBy(
    db
      .select()
      .from(trainStops)
      .where(slugs ? inArray(trainStops.trainSlug, slugs) : undefined)
      .orderBy(asc(trainStops.trainSlug), asc(trainStops.position))
      .all(),
    (s) => s.trainSlug,
  );
  const fares = groupBy(
    db
      .select({ trainSlug: trainFares.trainSlug, cls: trainFares.cls })
      .from(trainFares)
      .where(slugs ? inArray(trainFares.trainSlug, slugs) : undefined)
      .all(),
    (f) => f.trainSlug,
  );
  return rows.map((r) => toSummary(r, stops.get(r.slug) ?? [], fares.get(r.slug) ?? [], lang));
}

/** All 120 intercity trains, by number. */
export async function listTrains(lang: Lang = "bn"): Promise<TrainSummary[]> {
  return trainSummaries(lang);
}

/** A train with its stops, fare table, timetable reference and return train; null if unknown. */
export async function getTrain(slug: string, lang: Lang = "bn"): Promise<TrainDetail | null> {
  const db = getDb();
  const row = db.select().from(trains).where(eq(trains.slug, slug)).get();
  if (!row) return null;

  const stops = db
    .select({ s: trainStops, d: districts })
    .from(trainStops)
    .leftJoin(districts, eq(trainStops.districtId, districts.id))
    .where(eq(trainStops.trainSlug, slug))
    .orderBy(asc(trainStops.position))
    .all();
  const fares = db
    .select()
    .from(trainFares)
    .where(eq(trainFares.trainSlug, slug))
    .orderBy(asc(trainFares.position))
    .all();

  // Fares name stations in Bengali; translate through the stop list.
  const stationEn = new Map(stops.map(({ s }) => [s.stationBn, s.stationEn]));
  const station = (bn: string) => (lang === "bn" ? bn : (stationEn.get(bn) ?? bn));

  const back = row.returnTrain
    ? db.select().from(trains).where(eq(trains.slug, row.returnTrain)).get()
    : undefined;

  return {
    ...toSummary(
      row,
      stops.map(({ s }) => s),
      fares,
      lang,
    ),
    stops: stops.map(({ s, d }) => ({
      position: s.position,
      station: lang === "bn" ? s.stationBn : s.stationEn,
      stationBn: s.stationBn,
      stationEn: s.stationEn,
      district: d ? toDistrictRef(d, lang) : null,
      arr: s.arr,
      dep: s.dep,
      minutes: s.minutes,
    })),
    fares: fares.map((f) => ({
      from: station(f.fromStation),
      to: station(f.toStation),
      cls: f.cls,
      fare: f.fare,
    })),
    timetable: row.timetable,
    returnTrain: back ? { slug: back.slug, no: back.no, name: nameIn(lang, back) } : null,
  };
}
