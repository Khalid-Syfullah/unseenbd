/**
 * How the personal stores combine when they meet the account (shared by the browser and the
 * server, so both sides agree):
 *
 * - **Sets are unioned.** Visited districts, bucket-list places and world marks from this browser
 *   and from the account are all kept. Where both sides mark the same place or country
 *   differently, the further state wins ("been" over "want", "visited" over "wish"), so nothing a
 *   visitor has done is lost.
 * - **Single values are last-write-wins.** Each "My Bangladesh story" answer carries the time it
 *   was last changed; the newer one wins (a cleared answer is `null` with its own time).
 *
 * The `combine*` and `apply*` helpers fold queued changes together and lay them over a value.
 */
import { cleanDistrictIds } from "@/lib/visited/districts";
import type { BucketStatus, StoryField, WorldMark } from "./shapes";

/* -- visited districts ------------------------------------------------------------------------ */

export type VisitedDelta = { add: number[]; remove: number[] };

export const emptyVisitedDelta = (): VisitedDelta => ({ add: [], remove: [] });
export const isEmptyVisitedDelta = (d: VisitedDelta) => !d.add.length && !d.remove.length;

/** `a` then `b`, as one delta. */
export function combineVisited(a: VisitedDelta, b: VisitedDelta): VisitedDelta {
  const bAdd = new Set(b.add);
  const bRemove = new Set(b.remove);
  return {
    add: cleanDistrictIds([...a.add.filter((id) => !bRemove.has(id)), ...b.add]),
    remove: cleanDistrictIds([...a.remove.filter((id) => !bAdd.has(id)), ...b.remove]),
  };
}

export function applyVisited(ids: Iterable<number>, delta: VisitedDelta): number[] {
  const remove = new Set(delta.remove);
  return cleanDistrictIds([...ids, ...delta.add].filter((id) => !remove.has(id)));
}

export function unionVisited(a: Iterable<number>, b: Iterable<number>): number[] {
  return cleanDistrictIds([...a, ...b]);
}

/* -- keyed marks (bucket list, world map) ----------------------------------------------------- */

/** Keys newly set (with their value) and keys cleared. */
export type MapDelta<V extends string> = { set: Record<string, V>; clear: string[] };

export const emptyMapDelta = <V extends string>(): MapDelta<V> => ({ set: {}, clear: [] });
export const isEmptyMapDelta = <V extends string>(d: MapDelta<V>) =>
  !Object.keys(d.set).length && !d.clear.length;

export function combineMap<V extends string>(a: MapDelta<V>, b: MapDelta<V>): MapDelta<V> {
  const set: Record<string, V> = {};
  const bClear = new Set(b.clear);
  for (const [k, v] of Object.entries(a.set)) if (!bClear.has(k)) set[k] = v;
  Object.assign(set, b.set);
  const clear = new Set(a.clear.filter((k) => !(k in b.set)));
  for (const k of b.clear) clear.add(k);
  return { set, clear: [...clear].sort() };
}

export function applyMap<V extends string>(
  value: Readonly<Record<string, V>>,
  delta: MapDelta<V>,
): Record<string, V> {
  const out: Record<string, V> = { ...value };
  for (const k of delta.clear) delete out[k];
  Object.assign(out, delta.set);
  return out;
}

const BUCKET_RANK: Record<BucketStatus, number> = { want: 1, been: 2 };
const WORLD_RANK: Record<WorldMark, number> = { wish: 1, visited: 2 };

function unionRanked<V extends string>(
  a: Readonly<Record<string, V>>,
  b: Readonly<Record<string, V>>,
  rank: Record<V, number>,
): Record<string, V> {
  const out: Record<string, V> = { ...a };
  for (const [k, v] of Object.entries(b) as [string, V][]) {
    const mine = out[k];
    if (mine === undefined || rank[v] > rank[mine]) out[k] = v;
  }
  return out;
}

/** Union of two bucket lists; "been" beats "want". */
export function unionBucket(
  a: Readonly<Record<string, BucketStatus>>,
  b: Readonly<Record<string, BucketStatus>>,
): Record<string, BucketStatus> {
  return unionRanked(a, b, BUCKET_RANK);
}

/** Union of two world maps; "visited" beats "wish". */
export function unionWorld(
  a: Readonly<Record<string, WorldMark>>,
  b: Readonly<Record<string, WorldMark>>,
): Record<string, WorldMark> {
  return unionRanked(a, b, WORLD_RANK);
}

/** Changes from `before` to `after`, as a map delta. */
export function diffMap<V extends string>(
  before: Readonly<Record<string, V>>,
  after: Readonly<Record<string, V>>,
): MapDelta<V> {
  const set: Record<string, V> = {};
  const clear: string[] = [];
  for (const [k, v] of Object.entries(after)) if (before[k] !== v) set[k] = v;
  for (const k of Object.keys(before)) if (!(k in after)) clear.push(k);
  return { set, clear: clear.sort() };
}

/* -- story (last-write-wins per answer) ------------------------------------------------------- */

/** Answers (district id, or null when cleared) and when each last changed (ms). */
export type StoryState = {
  values: Partial<Record<StoryField, number | null>>;
  times: Partial<Record<StoryField, number>>;
};

export const emptyStoryState = (): StoryState => ({ values: {}, times: {} });
export const isEmptyStoryState = (s: StoryState) => !Object.keys(s.times).length;

/**
 * Per answer, the side changed most recently wins (ties go to `b`). An answer with no time on one
 * side counts as older than any timed one.
 */
export function mergeStory(a: StoryState, b: StoryState): StoryState {
  const out: StoryState = { values: { ...a.values }, times: { ...a.times } };
  const fields = new Set([...Object.keys(b.values), ...Object.keys(b.times)] as StoryField[]);
  for (const field of fields) {
    const ta = a.times[field] ?? -1;
    const tb = b.times[field] ?? -1;
    const aHas = field in a.values;
    if (!aHas || tb >= ta) {
      if (field in b.values) out.values[field] = b.values[field] ?? null;
      if (b.times[field] !== undefined) out.times[field] = b.times[field];
    }
  }
  return out;
}

/** Only the answers that are set (cleared ones dropped), as the stores keep them. */
export function storyAnswers(state: StoryState): Partial<Record<StoryField, number>> {
  const out: Partial<Record<StoryField, number>> = {};
  for (const [field, id] of Object.entries(state.values) as [StoryField, number | null][]) {
    if (typeof id === "number") out[field] = id;
  }
  return out;
}
