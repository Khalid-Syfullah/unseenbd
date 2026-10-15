/**
 * The districts a visitor has ticked: a set of district ids (1–64) kept in their own browser as a
 * JSON array under `unseenbd.visited`, synced across tabs. Earlier versions stored slugs; those
 * are read too and rewritten as ids on the next change. Nothing leaves the browser unless the
 * visitor shares a link, or (from phase 13) an account adapter is installed.
 */
import { cleanDistrictIds, districtIdOf, districtSlugOf } from "./districts";
import { safeJson, createLocalStore } from "./store";
import { adapterSlot, type SyncAdapter } from "./sync";

export const VISITED_KEY = "unseenbd.visited";

const EMPTY: readonly number[] = Object.freeze([]);

/** Parses the stored value into sorted, unique district ids; anything malformed is empty. */
export function parseVisited(raw: string | null | undefined): number[] {
  if (!raw) return [];
  const value = safeJson(raw);
  if (!Array.isArray(value)) return [];
  return cleanDistrictIds(
    value.map((v: unknown) => (typeof v === "string" ? (districtIdOf(v) ?? v) : v)),
  );
}

const store = createLocalStore<readonly number[]>({
  key: VISITED_KEY,
  empty: EMPTY,
  parse: (raw) => {
    const ids = parseVisited(raw);
    return ids.length ? Object.freeze(ids) : EMPTY;
  },
  serialize: (ids) => (ids.length ? JSON.stringify(ids) : null),
});

/** Add/remove lists, as the account API takes them. */
export type VisitedDelta = { add: number[]; remove: number[] };
export type VisitedSyncAdapter = SyncAdapter<VisitedDelta, readonly number[]>;

const sync = adapterSlot<VisitedDelta, readonly number[]>({
  get: () => store.get(),
  merge: (remote) => write(cleanDistrictIds([...store.get(), ...remote]), false),
});

/** Installs the account adapter (phase 13); the default does nothing. */
export function setVisitedSyncAdapter(adapter: VisitedSyncAdapter) {
  sync.install(adapter);
}

function write(next: number[], push: boolean) {
  const current = store.get();
  const before = new Set(current);
  const after = new Set(next);
  const add = next.filter((id) => !before.has(id));
  const remove = current.filter((id) => !after.has(id));
  if (!add.length && !remove.length) return;
  store.set(next.length ? Object.freeze(next) : EMPTY);
  if (push) sync.push({ add, remove });
}

function toId(district: number | string): number | null {
  return typeof district === "number"
    ? districtSlugOf(district)
      ? district
      : null
    : districtIdOf(district);
}

/** The visited district ids (ascending). Empty on the server and during hydration. */
export function getVisitedIds(): readonly number[] {
  return store.get();
}

/** Marks one district (by id or slug) as visited, or clears it. */
export function setDistrictVisited(district: number | string, visited: boolean) {
  const id = toId(district);
  if (id === null) return;
  setDistrictsVisited([id], visited);
}

/** Marks several districts at once ("whole division"), or clears them. */
export function setDistrictsVisited(ids: Iterable<number>, visited: boolean) {
  const current = store.get();
  const change = cleanDistrictIds(ids);
  const next = visited
    ? cleanDistrictIds([...current, ...change])
    : current.filter((id) => !change.includes(id));
  write(next, true);
}

/** Replaces the whole set (e.g. "clear all"). */
export function replaceVisited(ids: Iterable<number>) {
  write(cleanDistrictIds(ids), true);
}

/** Calls `listener` after every change (this tab or another). Returns an unsubscribe. */
export function subscribeVisited(listener: () => void): () => void {
  return store.subscribe(listener);
}

/** The visited district ids in a component. */
export function useVisitedIds(): readonly number[] {
  return store.use();
}

const slugCache = new WeakMap<readonly number[], readonly string[]>();

function slugsOf(ids: readonly number[]): readonly string[] {
  let slugs = slugCache.get(ids);
  if (!slugs) {
    slugs = Object.freeze(ids.map((id) => districtSlugOf(id)!).filter(Boolean));
    slugCache.set(ids, slugs);
  }
  return slugs;
}

/** The visited district slugs in a component (same data as `useVisitedIds`). */
export function useVisited(): readonly string[] {
  return slugsOf(store.use());
}
