/**
 * Traffic as daily aggregates. A page view adds one to a counter for (day, page) and one to the
 * day's total: no cookies, no IP addresses, no visitor ids are involved or stored. Uploads and
 * sign-ups for the dashboard are counted from the rows themselves, by day.
 */
import { eq, sql } from "drizzle-orm";
import { dhakaDay } from "@/lib/community/season";
import { SLUG_KEPT, visitPath } from "@/lib/visits";
import { getDb } from "../db/client";
import { createRateLimiter } from "../rate-limit";
import { dailyStats, districts, places } from "../db/schema";

export const VISITS_TOTAL = "visits";

/** 120 counted views a minute per IP (the address is only used for this limit, never stored). */
export const visitLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
const PAGE_PREFIX = "v:";

function bump(day: string, metric: string): void {
  getDb()
    .insert(dailyStats)
    .values({ day, metric, value: 1 })
    .onConflictDoUpdate({
      target: [dailyStats.day, dailyStats.metric],
      set: { value: sql`${dailyStats.value} + 1` },
    })
    .run();
}

/**
 * Counts one page view. Returns false when the path is not counted. A place or district page is
 * also counted under its slug when the slug exists.
 */
export function recordVisit(rawPath: unknown, now = new Date()): boolean {
  const path = visitPath(rawPath);
  if (!path) return false;
  const day = dhakaDay(now);
  getDb().transaction(() => {
    bump(day, VISITS_TOTAL);
    bump(day, `${PAGE_PREFIX}${path.pattern}`);
    if (path.slug && SLUG_KEPT.has(path.section) && slugExists(path.section, path.slug)) {
      bump(day, `${PAGE_PREFIX}/${path.section}/${path.slug}`);
    }
  });
  return true;
}

function slugExists(section: string, slug: string): boolean {
  const db = getDb();
  return section === "place"
    ? Boolean(db.select({ id: places.id }).from(places).where(eq(places.slug, slug)).get())
    : Boolean(
        db.select({ id: districts.id }).from(districts).where(eq(districts.slug, slug)).get(),
      );
}

export type DayStats = { day: string; visits: number; uploads: number; signups: number };
export type StatsReport = {
  from: string;
  to: string;
  days: DayStats[];
  totals: { visits: number; uploads: number; signups: number };
  /** Most viewed pages in the range (patterns and place/district slugs). */
  pages: { path: string; visits: number }[];
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_RANGE_DAYS = 366;

export function isDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_DAY.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
  );
}

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** Visits, uploads (photos and posts) and sign-ups per day for `from`..`to` (Bangladesh days). */
export function statsReport(from: string, to: string): StatsReport {
  const sqlite = getDb().$client;
  const days = daysBetween(from, to).slice(0, MAX_RANGE_DAYS);
  const last = days[days.length - 1] ?? from;
  const byDay = new Map<string, DayStats>(
    days.map((d) => [d, { day: d, visits: 0, uploads: 0, signups: 0 }]),
  );

  const visitRows = sqlite
    .prepare("SELECT day, value FROM daily_stats WHERE metric = ? AND day BETWEEN ? AND ?")
    .all(VISITS_TOTAL, from, last) as { day: string; value: number }[];
  for (const r of visitRows) {
    const d = byDay.get(r.day);
    if (d) d.visits = r.value;
  }
  // created_at is UTC ("YYYY-MM-DD HH:MM:SS"); the Bangladesh day is UTC + 6 hours.
  const perDay = (table: string) =>
    sqlite
      .prepare(
        `SELECT date(created_at, '+6 hours') AS day, count(*) AS n FROM ${table}
         WHERE date(created_at, '+6 hours') BETWEEN ? AND ? GROUP BY day`,
      )
      .all(from, last) as { day: string; n: number }[];
  for (const table of ["photos", "posts"]) {
    for (const r of perDay(table)) {
      const d = byDay.get(r.day);
      if (d) d.uploads += r.n;
    }
  }
  for (const r of perDay("users")) {
    const d = byDay.get(r.day);
    if (d) d.signups += r.n;
  }
  const pages = (
    sqlite
      .prepare(
        `SELECT substr(metric, 3) AS path, sum(value) AS visits FROM daily_stats
         WHERE metric LIKE 'v:%' AND day BETWEEN ? AND ? GROUP BY metric
         ORDER BY visits DESC, path LIMIT 30`,
      )
      .all(from, last) as { path: string; visits: number }[]
  ).map((r) => ({ path: r.path, visits: r.visits }));

  const list = [...byDay.values()];
  return {
    from,
    to: last,
    days: list,
    totals: {
      visits: list.reduce((n, d) => n + d.visits, 0),
      uploads: list.reduce((n, d) => n + d.uploads, 0),
      signups: list.reduce((n, d) => n + d.signups, 0),
    },
    pages,
  };
}
