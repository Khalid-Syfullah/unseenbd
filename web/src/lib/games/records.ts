/**
 * Personal records, kept in this browser only (MASTER_PROMPT §1.2): for each game the best score
 * ever, the last five rounds ("five-round record") and the days a score was sent to the
 * leaderboard. Stored as JSON under one localStorage key.
 */
import { useSyncExternalStore } from "react";
import { isIsoDate } from "./seed";
import { isGameKey, type GameKey } from "./types";

export const RECORDS_KEY = "unseenbd.games";
/** Rounds kept in the five-round record. */
export const RECENT_ROUNDS = 5;

export type RoundRecord = { date: string; score: number };
export type GameRecord = {
  best: number | null;
  /** Newest first, at most five. */
  recent: RoundRecord[];
  /** Days (`YYYY-MM-DD`) whose score was sent to the leaderboard. */
  submitted: string[];
};
export type GameRecords = Readonly<Partial<Record<GameKey, GameRecord>>>;

const EMPTY: GameRecords = Object.freeze({});
export const EMPTY_RECORD: GameRecord = Object.freeze({
  best: null,
  recent: [],
  submitted: [],
}) as GameRecord;

const isScore = (v: unknown): v is number => Number.isInteger(v) && Math.abs(v as number) <= 1000;

/** Parses the stored value; anything malformed is dropped. */
export function parseRecords(raw: string | null | undefined): Partial<Record<GameKey, GameRecord>> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Partial<Record<GameKey, GameRecord>> = {};
    for (const [key, rec] of Object.entries(value as Record<string, unknown>)) {
      if (!isGameKey(key) || !rec || typeof rec !== "object") continue;
      const r = rec as Record<string, unknown>;
      const recent = Array.isArray(r.recent)
        ? r.recent
            .filter(
              (x): x is RoundRecord =>
                !!x &&
                typeof x === "object" &&
                isIsoDate((x as RoundRecord).date) &&
                isScore((x as RoundRecord).score),
            )
            .slice(0, RECENT_ROUNDS)
            .map((x) => ({ date: x.date, score: x.score }))
        : [];
      const submitted = Array.isArray(r.submitted) ? r.submitted.filter(isIsoDate).slice(-30) : [];
      out[key] = { best: isScore(r.best) ? r.best : null, recent, submitted };
    }
    return out;
  } catch {
    return {};
  }
}

/** The record after one more round. */
export function withRound(record: GameRecord | undefined, date: string, score: number): GameRecord {
  const base = record ?? EMPTY_RECORD;
  return {
    best: base.best === null ? score : Math.max(base.best, score),
    recent: [{ date, score }, ...base.recent].slice(0, RECENT_ROUNDS),
    submitted: base.submitted,
  };
}

/** The record with `date` marked as sent to the leaderboard. */
export function withSubmitted(record: GameRecord | undefined, date: string): GameRecord {
  const base = record ?? EMPTY_RECORD;
  if (base.submitted.includes(date)) return base;
  return { ...base, submitted: [...base.submitted, date].slice(-30) };
}

/** Best of the last five rounds, or null before the first round. */
export function bestOfRecent(record: GameRecord | undefined): number | null {
  if (!record?.recent.length) return null;
  return Math.max(...record.recent.map((r) => r.score));
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(RECORDS_KEY);
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cached: GameRecords = EMPTY;
let memory: GameRecords | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): GameRecords {
  if (memory) return memory;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    const parsed = parseRecords(raw);
    cached = Object.keys(parsed).length ? parsed : EMPTY;
  }
  return cached;
}

function write(next: GameRecords) {
  const text = JSON.stringify(next);
  try {
    window.localStorage.setItem(RECORDS_KEY, text);
  } catch {
    // storage blocked: keep it in memory for this page
  }
  memory = readRaw() === text ? null : next;
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === RECORDS_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Saves a finished round. */
export function recordRound(game: GameKey, date: string, score: number) {
  const all = getSnapshot();
  write({ ...all, [game]: withRound(all[game], date, score) });
}

/** Remembers that today's score went to the leaderboard (one entry per game per day). */
export function recordSubmitted(game: GameKey, date: string) {
  const all = getSnapshot();
  write({ ...all, [game]: withSubmitted(all[game], date) });
}

/** All records. Empty on the server and during hydration. */
export function useGameRecords(): GameRecords {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
