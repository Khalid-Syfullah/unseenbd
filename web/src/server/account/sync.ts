/**
 * The personal stores on the account side: visited districts, bucket list (`wishlist`), world
 * marks and the My Bangladesh story. Each has a read, an apply-changes and a part of the
 * sign-in merge (`mergeLocalState`), with the rules in `src/lib/account/merge.ts`.
 */
import { and, eq, inArray } from "drizzle-orm";
import {
  mergeStory,
  unionBucket,
  unionWorld,
  type MapDelta,
  type StoryState,
  type VisitedDelta,
} from "@/lib/account/merge";
import {
  cleanBucket,
  isBucketStatus,
  isCountryKey,
  isPlaceSlug,
  isStoryField,
  cleanWorld,
  isWorldMark,
  STORY_FIELDS,
  type BucketStatus,
  type StoryField,
  type WorldMark,
} from "@/lib/account/shapes";
import { cleanDistrictIds } from "@/lib/visited/districts";
import { getDb } from "../db/client";
import { places, users, visited, wishlist, worldMarks } from "../db/schema";

/** Caps that keep one account's rows bounded. */
export const MAX_BUCKET = 1000;
export const MAX_WORLD = 300;

/* -- parsing request bodies ------------------------------------------------------------------- */

const isObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

export function parseVisitedDelta(body: Record<string, unknown>): VisitedDelta | null {
  const { add = [], remove = [] } = body;
  if (!Array.isArray(add) || !Array.isArray(remove) || add.length > 64 || remove.length > 64) {
    return null;
  }
  return { add: cleanDistrictIds(add), remove: cleanDistrictIds(remove) };
}

function parseMapDelta<V extends string>(
  body: Record<string, unknown>,
  validKey: (k: string) => boolean,
  validValue: (v: unknown) => v is V,
  max: number,
): MapDelta<V> | null {
  const { set = {}, clear = [] } = body;
  if (!isObject(set) || !Array.isArray(clear)) return null;
  if (Object.keys(set).length > max || clear.length > max) return null;
  const out: MapDelta<V> = { set: {}, clear: [] };
  for (const [k, v] of Object.entries(set)) if (validKey(k) && validValue(v)) out.set[k] = v;
  for (const k of clear) if (typeof k === "string" && validKey(k)) out.clear.push(k);
  return out;
}

export const parseBucketDelta = (body: Record<string, unknown>) =>
  parseMapDelta(body, isPlaceSlug, isBucketStatus, MAX_BUCKET);

export const parseWorldDelta = (body: Record<string, unknown>) =>
  parseMapDelta(body, isCountryKey, isWorldMark, MAX_WORLD);

/** `{values, times}` from a body: district ids (or null) and positive times, per known field. */
export function parseStoryState(value: unknown): StoryState | null {
  if (!isObject(value)) return null;
  const { values = {}, times = {} } = value;
  if (!isObject(values) || !isObject(times)) return null;
  const out: StoryState = { values: {}, times: {} };
  const latest = Date.now() + 5 * 60_000; // a clock running ahead may not pin a field forever
  for (const field of STORY_FIELDS) {
    const at = times[field];
    if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) continue;
    const id = values[field];
    if (id !== null && !cleanDistrictIds([id]).length) continue;
    out.values[field] = id as number | null;
    out.times[field] = Math.min(Math.round(at), latest);
  }
  return out;
}

/* -- visited ---------------------------------------------------------------------------------- */

export function getVisited(userId: number): number[] {
  const rows = getDb()
    .select({ id: visited.districtId })
    .from(visited)
    .where(eq(visited.userId, userId))
    .all();
  return cleanDistrictIds(rows.map((r) => r.id));
}

export function applyVisitedDelta(userId: number, delta: VisitedDelta): number[] {
  const db = getDb();
  db.transaction((tx) => {
    if (delta.remove.length) {
      tx.delete(visited)
        .where(and(eq(visited.userId, userId), inArray(visited.districtId, delta.remove)))
        .run();
    }
    if (delta.add.length) {
      tx.insert(visited)
        .values(delta.add.map((districtId) => ({ userId, districtId })))
        .onConflictDoNothing()
        .run();
    }
  });
  return getVisited(userId);
}

/* -- bucket list ------------------------------------------------------------------------------ */

export function getBucketOf(userId: number): Record<string, BucketStatus> {
  const rows = getDb()
    .select({ slug: places.slug, status: wishlist.status })
    .from(wishlist)
    .innerJoin(places, eq(places.id, wishlist.placeId))
    .where(eq(wishlist.userId, userId))
    .all();
  return Object.fromEntries(rows.map((r) => [r.slug, r.status]));
}

function placeIds(slugs: string[]): Map<string, number> {
  if (!slugs.length) return new Map();
  const rows = getDb()
    .select({ id: places.id, slug: places.slug })
    .from(places)
    .where(inArray(places.slug, slugs))
    .all();
  return new Map(rows.map((r) => [r.slug, r.id]));
}

export function applyBucketDelta(
  userId: number,
  delta: MapDelta<BucketStatus>,
): Record<string, BucketStatus> {
  const ids = placeIds([...Object.keys(delta.set), ...delta.clear]);
  const db = getDb();
  db.transaction((tx) => {
    const clear = delta.clear.map((s) => ids.get(s)).filter((id): id is number => id !== undefined);
    if (clear.length) {
      tx.delete(wishlist)
        .where(and(eq(wishlist.userId, userId), inArray(wishlist.placeId, clear)))
        .run();
    }
    for (const [slug, status] of Object.entries(delta.set)) {
      const placeId = ids.get(slug);
      if (placeId === undefined) continue;
      tx.insert(wishlist)
        .values({ userId, placeId, status })
        .onConflictDoUpdate({ target: [wishlist.userId, wishlist.placeId], set: { status } })
        .run();
    }
  });
  return getBucketOf(userId);
}

/* -- world ------------------------------------------------------------------------------------ */

export function getWorldOf(userId: number): Record<string, WorldMark> {
  const rows = getDb()
    .select({ country: worldMarks.country, mark: worldMarks.mark })
    .from(worldMarks)
    .where(eq(worldMarks.userId, userId))
    .all();
  return Object.fromEntries(rows.map((r) => [r.country, r.mark]));
}

export function applyWorldDelta(
  userId: number,
  delta: MapDelta<WorldMark>,
): Record<string, WorldMark> {
  const db = getDb();
  db.transaction((tx) => {
    if (delta.clear.length) {
      tx.delete(worldMarks)
        .where(and(eq(worldMarks.userId, userId), inArray(worldMarks.country, delta.clear)))
        .run();
    }
    let count = tx
      .select({ country: worldMarks.country })
      .from(worldMarks)
      .where(eq(worldMarks.userId, userId))
      .all().length;
    for (const [country, mark] of Object.entries(delta.set)) {
      const exists = tx
        .select({ c: worldMarks.country })
        .from(worldMarks)
        .where(and(eq(worldMarks.userId, userId), eq(worldMarks.country, country)))
        .get();
      if (!exists && count >= MAX_WORLD) continue;
      if (!exists) count += 1;
      tx.insert(worldMarks)
        .values({ userId, country, mark })
        .onConflictDoUpdate({ target: [worldMarks.userId, worldMarks.country], set: { mark } })
        .run();
    }
  });
  return getWorldOf(userId);
}

/* -- story ------------------------------------------------------------------------------------ */

export function getStoryOf(userId: number): StoryState {
  const row = getDb()
    .select({ story: users.story, times: users.storyTimes })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  const out: StoryState = { values: {}, times: {} };
  const story = isObject(row?.story) ? row.story : {};
  const times = isObject(row?.times) ? row.times : {};
  for (const [field, at] of Object.entries(times)) {
    if (!isStoryField(field) || typeof at !== "number") continue;
    const id = story[field];
    out.values[field as StoryField] = typeof id === "number" ? id : null;
    out.times[field as StoryField] = at;
  }
  // Answers saved without a time (older rows) still count.
  for (const [field, id] of Object.entries(story)) {
    if (isStoryField(field) && typeof id === "number" && !(field in out.values)) {
      out.values[field] = id;
    }
  }
  return out;
}

export function applyStory(userId: number, incoming: StoryState): StoryState {
  const merged = mergeStory(getStoryOf(userId), incoming);
  getDb()
    .update(users)
    .set({
      story: merged.values as Record<string, number | null>,
      storyTimes: merged.times as Record<string, number>,
    })
    .where(eq(users.id, userId))
    .run();
  return merged;
}

/* -- sign-in merge ---------------------------------------------------------------------------- */

export type AccountState = {
  visited: number[];
  bucket: Record<string, BucketStatus>;
  world: Record<string, WorldMark>;
  story: StoryState;
};

export function getAccountState(userId: number): AccountState {
  return {
    visited: getVisited(userId),
    bucket: getBucketOf(userId),
    world: getWorldOf(userId),
    story: getStoryOf(userId),
  };
}

/** Parses `POST /api/me/sync`'s body: whatever this browser had before signing in. */
export function parseLocalState(body: Record<string, unknown>): AccountState | null {
  const visitedIds = body.visited ?? [];
  const bucket = body.bucket ?? {};
  const world = body.world ?? {};
  if (!Array.isArray(visitedIds) || visitedIds.length > 64) return null;
  if (!isObject(bucket) || Object.keys(bucket).length > MAX_BUCKET) return null;
  if (!isObject(world) || Object.keys(world).length > MAX_WORLD) return null;
  const story = parseStoryState(body.story ?? { values: {}, times: {} });
  if (!story) return null;
  const localBucket: Record<string, BucketStatus> = {};
  for (const [slug, status] of Object.entries(cleanBucket(bucket))) {
    if (isPlaceSlug(slug)) localBucket[slug] = status;
  }
  return {
    visited: cleanDistrictIds(visitedIds),
    bucket: localBucket,
    world: cleanWorld(world),
    story,
  };
}

/**
 * Folds a browser's logged-out state into the account (unions for the sets, newest answer for
 * the story) and returns the account's state afterwards, which the browser then adopts.
 */
export function mergeLocalState(userId: number, local: AccountState): AccountState {
  const current = getAccountState(userId);
  applyVisitedDelta(userId, { add: local.visited, remove: [] });

  const bucket = unionBucket(current.bucket, local.bucket);
  const bucketSet: Record<string, BucketStatus> = {};
  for (const [slug, status] of Object.entries(bucket)) {
    if (current.bucket[slug] !== status) bucketSet[slug] = status;
  }
  applyBucketDelta(userId, { set: bucketSet, clear: [] });

  const world = unionWorld(current.world, local.world);
  const worldSet: Record<string, WorldMark> = {};
  for (const [country, mark] of Object.entries(world)) {
    if (current.world[country] !== mark) worldSet[country] = mark;
  }
  applyWorldDelta(userId, { set: worldSet, clear: [] });

  applyStory(userId, local.story);
  return getAccountState(userId);
}
