/**
 * "My World": countries a visitor has been to or wants to visit, keyed by ISO 3166-1 alpha-2
 * code (or the map's slug for the few shapes without one), plus travel memory pins. Both live in
 * the visitor's own browser and stay in step across tabs, like the districts store.
 */
import { unionWorld } from "@/lib/account/merge";
import { cleanWorld, isCountryKey, type WorldMark } from "@/lib/account/shapes";
import { createLocalStore, safeJson } from "./store";
import { adapterSlot, type SyncAdapter } from "./sync";

export const WORLD_KEY = "unseenbd.world";
export const WORLD_PINS_KEY = "unseenbd.world.pins";

export { isCountryKey, type WorldMark } from "@/lib/account/shapes";
export type WorldMarks = Readonly<Record<string, WorldMark>>;

const EMPTY_MARKS: WorldMarks = Object.freeze({});

export function isIso2(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

/** Parses the stored marks; anything malformed is dropped. */
export function parseWorld(raw: string | null | undefined): Record<string, WorldMark> {
  return raw ? cleanWorld(safeJson(raw)) : {};
}

const marksStore = createLocalStore<WorldMarks>({
  key: WORLD_KEY,
  empty: EMPTY_MARKS,
  parse: (raw) => {
    const marks = parseWorld(raw);
    return Object.keys(marks).length ? Object.freeze(marks) : EMPTY_MARKS;
  },
  serialize: (marks) => (Object.keys(marks).length ? JSON.stringify(marks) : null),
});

/** Countries newly marked (with their mark) and countries cleared. */
export type WorldDelta = { set: Record<string, WorldMark>; clear: string[] };
export type WorldSyncAdapter = SyncAdapter<WorldDelta, WorldMarks>;

const sync = adapterSlot<WorldDelta, WorldMarks>({
  get: () => marksStore.get(),
  // A union: where both sides mark a country, "visited" beats "wish" (as on the server).
  merge: (remote) =>
    writeMarks(unionWorld(marksStore.get(), parseWorld(JSON.stringify(remote))), false),
  replace: (remote) => writeMarks(parseWorld(JSON.stringify(remote)), false),
});

/** Installs the account adapter (on sign-in); the default does nothing. */
export function setWorldSyncAdapter(adapter: WorldSyncAdapter) {
  sync.install(adapter);
}

function writeMarks(next: Record<string, WorldMark>, push: boolean) {
  const current = marksStore.get();
  const set: Record<string, WorldMark> = {};
  const clear: string[] = [];
  for (const [key, mark] of Object.entries(next)) if (current[key] !== mark) set[key] = mark;
  for (const key of Object.keys(current)) if (!(key in next)) clear.push(key);
  if (!Object.keys(set).length && !clear.length) return;
  marksStore.set(Object.keys(next).length ? Object.freeze(next) : EMPTY_MARKS);
  if (push) sync.push({ set, clear });
}

/** Marks a country (`null` clears it). */
export function setCountryMark(key: string, mark: WorldMark | null) {
  if (!isCountryKey(key)) return;
  const next = { ...marksStore.get() };
  if (mark) next[key] = mark;
  else delete next[key];
  writeMarks(next, true);
}

/** Forgets the local marks without telling the account (on sign-out). */
export function clearWorldLocal() {
  writeMarks({}, false);
}

/** Takes the account's marks as the local value, without pushing them back (after sign-in). */
export function adoptWorld(marks: Readonly<Record<string, WorldMark>>) {
  writeMarks(parseWorld(JSON.stringify(marks)), false);
}

/** Clears every mark. */
export function clearWorld() {
  writeMarks({}, true);
}

export function getWorldMarks(): WorldMarks {
  return marksStore.get();
}

export function useWorldMarks(): WorldMarks {
  return marksStore.use();
}

/* -- memory pins ------------------------------------------------------------------------------ */

export type MemoryPin = {
  id: string;
  /** Country key, as in the marks. */
  country: string;
  /** `YYYY-MM-DD`, or empty. */
  date: string;
  note: string;
};

export const MAX_PINS = 100;
export const MAX_PIN_NOTE = 200;

const EMPTY_PINS: readonly MemoryPin[] = Object.freeze([]);

function cleanPin(value: unknown): MemoryPin | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !v.id || !isCountryKey(v.country)) return null;
  const date = typeof v.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : "";
  const note = typeof v.note === "string" ? v.note.slice(0, MAX_PIN_NOTE) : "";
  return { id: v.id.slice(0, 40), country: v.country, date, note };
}

export function parsePins(raw: string | null | undefined): MemoryPin[] {
  if (!raw) return [];
  const value = safeJson(raw);
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanPin)
    .filter((p): p is MemoryPin => p !== null)
    .slice(0, MAX_PINS);
}

const pinsStore = createLocalStore<readonly MemoryPin[]>({
  key: WORLD_PINS_KEY,
  empty: EMPTY_PINS,
  parse: (raw) => {
    const pins = parsePins(raw);
    return pins.length ? Object.freeze(pins) : EMPTY_PINS;
  },
  serialize: (pins) => (pins.length ? JSON.stringify(pins) : null),
});

/** Adds a memory pin (newest first). Returns false when the pin is invalid or the list is full. */
export function addPin(pin: Omit<MemoryPin, "id">): boolean {
  const current = pinsStore.get();
  if (current.length >= MAX_PINS) return false;
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const clean = cleanPin({ ...pin, id, note: pin.note.trim() });
  if (!clean) return false;
  pinsStore.set(Object.freeze([clean, ...current]));
  return true;
}

export function removePin(id: string) {
  const current = pinsStore.get();
  const next = current.filter((p) => p.id !== id);
  if (next.length !== current.length) pinsStore.set(next.length ? Object.freeze(next) : EMPTY_PINS);
}

export function useMemoryPins(): readonly MemoryPin[] {
  return pinsStore.use();
}
