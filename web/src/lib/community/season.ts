/**
 * Travel seasons for trending votes. Each visitor has one vote per place per season, and the
 * home page ranks places by the current season's votes.
 *
 * - winter: November – February (the busy season; named after the year it starts in)
 * - summer: March – May
 * - monsoon: June – August
 * - autumn: September – October
 *
 * Dates are taken in Bangladesh time (UTC+6).
 */
export const SEASONS = ["winter", "summer", "monsoon", "autumn"] as const;
export type Season = (typeof SEASONS)[number];

export type SeasonInfo = {
  /** e.g. "2026-winter" (stored with every vote). */
  key: string;
  season: Season;
  /** Year the season starts in. */
  year: number;
  /** First and last month (1–12); winter wraps (11 → 2). */
  from: number;
  to: number;
};

const RANGES: Record<Season, [number, number]> = {
  winter: [11, 2],
  summer: [3, 5],
  monsoon: [6, 8],
  autumn: [9, 10],
};

function dhaka(now: Date) {
  const d = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function seasonOf(now: Date = new Date()): SeasonInfo {
  const { year, month } = dhaka(now);
  let season: Season;
  let start = year;
  if (month >= 11 || month <= 2) {
    season = "winter";
    if (month <= 2) start = year - 1;
  } else if (month <= 5) season = "summer";
  else if (month <= 8) season = "monsoon";
  else season = "autumn";
  const [from, to] = RANGES[season];
  return { key: `${start}-${season}`, season, year: start, from, to };
}

/** True when `month` (1–12) falls inside the season. */
export function monthInSeason(season: Season, month: number): boolean {
  const [from, to] = RANGES[season];
  return from <= to ? month >= from && month <= to : month >= from || month <= to;
}

/** "YYYY-MM-DD" in Bangladesh time: the day daily quotas count against. */
export function dhakaDay(now: Date = new Date()): string {
  return new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
