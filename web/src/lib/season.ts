/**
 * Best-season logic. A place's season runs from `best_from` to `best_to` inclusive and may wrap
 * across the new year: 11 → 3 means November, December, January, February and March.
 */

function assertMonth(m: number, label: string) {
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    throw new RangeError(`${label} must be an integer 1–12, got ${m}`);
  }
}

/** True when `month` falls inside the season `from`–`to` (inclusive, wrapping past December). */
export function inSeason(from: number, to: number, month: number): boolean {
  assertMonth(from, "from");
  assertMonth(to, "to");
  assertMonth(month, "month");
  if (from <= to) return month >= from && month <= to;
  return month >= from || month <= to;
}

/** The months of a season in order, starting at `from`: `seasonMonths(11, 2)` → [11, 12, 1, 2]. */
export function seasonMonths(from: number, to: number): number[] {
  assertMonth(from, "from");
  assertMonth(to, "to");
  const out: number[] = [];
  let m = from;
  for (;;) {
    out.push(m);
    if (m === to) return out;
    m = (m % 12) + 1;
  }
}

/** How many months the season lasts (1–12). */
export function seasonLength(from: number, to: number): number {
  return seasonMonths(from, to).length;
}

/** True when the season covers the whole year (1 → 12, or any `to` just before `from`). */
export function isYearRound(from: number, to: number): boolean {
  return seasonLength(from, to) === 12;
}

/** The current month (1–12) in Bangladesh time (UTC+6, no daylight saving). */
export function currentMonth(now: Date = new Date()): number {
  return new Date(now.getTime() + 6 * 60 * 60 * 1000).getUTCMonth() + 1;
}
