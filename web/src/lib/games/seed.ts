/**
 * The daily seed (MASTER_PROMPT §5.8): every visitor gets the same rounds for a game on a given
 * day, because the rounds come from a pseudo-random generator seeded with `game:date`. The same
 * code runs in the browser (to play) and on the server (to re-score leaderboard answers).
 *
 * Pure functions, no `Math.random`, no clock unless one is passed in.
 */

/** Days run on Bangladesh time (UTC+6, no daylight saving). */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` for a real calendar day. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today's date in Dhaka as `YYYY-MM-DD`. */
export function dhakaDate(now: Date | number = Date.now()): string {
  const ms = typeof now === "number" ? now : now.getTime();
  return new Date(ms + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** `date` moved by `days` (negative goes back). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DAY_MS,
  );
}

/** A 32-bit hash of a string (cyrb53, folded), stable across engines. */
export function hashString(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** A seeded generator: `next()` gives a float in [0, 1). */
export type Rng = {
  next(): number;
  /** A whole number in [0, n). */
  int(n: number): number;
};

/** mulberry32: small, fast and good enough for shuffling quiz questions. */
export function createRng(seed: string | number): Rng {
  let state = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n) };
}

/** The seed string for one game on one day. */
export function dailySeed(game: string, date: string): string {
  return `unseenbd:${game}:${date}`;
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** `n` distinct items picked at random (fewer when there are not enough). */
export function sample<T>(rng: Rng, items: readonly T[], n: number): T[] {
  return shuffle(rng, items).slice(0, Math.max(0, n));
}
