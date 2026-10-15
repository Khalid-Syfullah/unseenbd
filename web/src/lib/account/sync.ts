/**
 * Wires the browser stores (visited districts, bucket list, world marks, story) to the account:
 * the sign-in merge, the four sync adapters, and clearing the local copies on sign-out.
 */
import {
  adoptBucket,
  clearBucketLocal,
  getBucket,
  parseBucket,
  setBucketSyncAdapter,
  type Bucket,
  type BucketDelta,
} from "@/lib/bucket";
import { cleanDistrictIds } from "@/lib/visited/districts";
import {
  adoptStory,
  clearStoryLocal,
  getStoryState,
  setStorySyncAdapter,
  STORY_FIELDS,
} from "@/lib/visited/story";
import { noopSyncAdapter } from "@/lib/visited/sync";
import {
  adoptVisited,
  clearVisitedLocal,
  getVisitedIds,
  setVisitedSyncAdapter,
  type VisitedDelta,
} from "@/lib/visited/visited";
import {
  adoptWorld,
  clearWorldLocal,
  getWorldMarks,
  parseWorld,
  setWorldSyncAdapter,
  type WorldDelta,
  type WorldMarks,
} from "@/lib/visited/world";
import { createAccountAdapter, type AccountAdapter } from "./adapter";
import { apiFetch, getAccount, loadAccount, setGuest } from "./client";
import {
  applyMap,
  applyVisited,
  combineMap,
  combineVisited,
  emptyMapDelta,
  emptyVisitedDelta,
  isEmptyMapDelta,
  isEmptyVisitedDelta,
  mergeStory,
  type StoryState,
} from "./merge";

/** Everything the account keeps of the personal stores. */
export type SyncedState = {
  visited: number[];
  bucket: Record<string, "want" | "been">;
  world: Record<string, "visited" | "wish">;
  story: StoryState;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** What this browser holds right now (sent once, right after signing in). */
export function localSnapshot(): SyncedState {
  return {
    visited: [...getVisitedIds()],
    bucket: { ...getBucket() },
    world: { ...getWorldMarks() },
    story: getStoryState(),
  };
}

function parseStory(json: unknown): StoryState | null {
  if (!isObject(json) || !isObject(json.values) || !isObject(json.times)) return null;
  const out: StoryState = { values: {}, times: {} };
  for (const field of STORY_FIELDS) {
    const at = json.times[field];
    if (typeof at === "number") out.times[field] = at;
    const id = json.values[field];
    if (typeof id === "number" || id === null) out.values[field] = id;
  }
  return out;
}

export function parseSyncedState(json: unknown): SyncedState | null {
  if (!isObject(json) || !Array.isArray(json.visited)) return null;
  const story = parseStory(json.story);
  if (!story) return null;
  return {
    visited: cleanDistrictIds(json.visited),
    bucket: parseBucket(JSON.stringify(json.bucket ?? {})),
    world: parseWorld(JSON.stringify(json.world ?? {})),
    story,
  };
}

/* -- the four adapters ------------------------------------------------------------------------ */

type AdapterDeps = {
  fetch?: typeof fetch;
  csrf?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
  listen?: boolean;
  debounceMs?: number;
};

const csrfFromAccount = () => getAccount().csrf;

function common(deps: AdapterDeps) {
  return {
    fetch: deps.fetch,
    csrf: deps.csrf ?? csrfFromAccount,
    onUnauthorized: deps.onUnauthorized ?? handleSessionEnded,
    onForbidden: async () => {
      await loadAccount({ force: true });
    },
    listen: deps.listen,
    debounceMs: deps.debounceMs,
  };
}

export function visitedAdapter(deps: AdapterDeps = {}) {
  return createAccountAdapter<VisitedDelta, readonly number[]>({
    ...common(deps),
    endpoint: "/api/me/visited",
    empty: emptyVisitedDelta,
    isEmpty: isEmptyVisitedDelta,
    combine: combineVisited,
    body: (d) => d,
    parse: (json) =>
      isObject(json) && Array.isArray(json.ids) ? cleanDistrictIds(json.ids) : null,
    apply: (ids, d) => applyVisited(ids, d),
  });
}

export function bucketAdapter(deps: AdapterDeps = {}) {
  return createAccountAdapter<BucketDelta, Bucket>({
    ...common(deps),
    endpoint: "/api/me/wishlist",
    empty: emptyMapDelta,
    isEmpty: isEmptyMapDelta,
    combine: combineMap,
    body: (d) => d,
    parse: (json) =>
      isObject(json) && isObject(json.bucket) ? parseBucket(JSON.stringify(json.bucket)) : null,
    apply: (value, d) => applyMap(value, d),
  });
}

export function worldAdapter(deps: AdapterDeps = {}) {
  return createAccountAdapter<WorldDelta, WorldMarks>({
    ...common(deps),
    endpoint: "/api/me/world",
    empty: emptyMapDelta,
    isEmpty: isEmptyMapDelta,
    combine: combineMap,
    body: (d) => d,
    parse: (json) =>
      isObject(json) && isObject(json.marks) ? parseWorld(JSON.stringify(json.marks)) : null,
    apply: (value, d) => applyMap(value, d),
  });
}

export function storyAdapter(deps: AdapterDeps = {}) {
  return createAccountAdapter<StoryState, StoryState>({
    ...common(deps),
    endpoint: "/api/me/story",
    empty: () => ({ values: {}, times: {} }),
    isEmpty: (d) => !Object.keys(d.times).length,
    combine: mergeStory,
    body: (d) => d,
    parse: parseStory,
    apply: mergeStory,
  });
}

/* -- install / remove ------------------------------------------------------------------------- */

let installed: AccountAdapter<unknown, unknown>[] = [];

/** Starts mirroring the four stores to the account (call once signed in). */
export function installAccountSync(deps: AdapterDeps = {}) {
  uninstallAccountSync();
  const visited = visitedAdapter(deps);
  const bucket = bucketAdapter(deps);
  const world = worldAdapter(deps);
  const story = storyAdapter(deps);
  setVisitedSyncAdapter(visited);
  setBucketSyncAdapter(bucket);
  setWorldSyncAdapter(world);
  setStorySyncAdapter(story);
  installed = [visited, bucket, world, story] as AccountAdapter<unknown, unknown>[];
}

/** Sends every queued change now. */
export async function flushAccountSync(options?: { keepalive?: boolean }) {
  await Promise.all(installed.map((a) => a.flush(options)));
}

/** Reads the account again (e.g. after the profile page changed something). */
export async function pullAccountSync() {
  await Promise.all(installed.map((a) => a.pull()));
}

/** Back to local-only stores. */
export function uninstallAccountSync() {
  setVisitedSyncAdapter(noopSyncAdapter());
  setBucketSyncAdapter(noopSyncAdapter());
  setWorldSyncAdapter(noopSyncAdapter());
  setStorySyncAdapter(noopSyncAdapter());
  installed = [];
}

/** Makes the account's state the local state of every store (without pushing it back). */
export function adoptSyncedState(state: SyncedState) {
  adoptVisited(state.visited);
  adoptBucket(state.bucket);
  adoptWorld(state.world);
  adoptStory(state.story);
}

/** Forgets the local copies of the synced stores (on sign-out). Nothing is sent to the account. */
export function clearLocalCopies() {
  uninstallAccountSync();
  clearVisitedLocal();
  clearBucketLocal();
  clearWorldLocal();
  clearStoryLocal();
}

/**
 * Right after signing in: sends what this browser saved while logged out, adopts the merged
 * account state, then keeps syncing. If the merge request fails, the local stores keep their
 * data and the adapters' first pull will not drop it (the merge is retried on the next page).
 */
export async function mergeLocalIntoAccount(deps: AdapterDeps = {}): Promise<boolean> {
  try {
    const res = await apiFetch("/api/me/sync", { method: "POST", json: localSnapshot() });
    const state = res.ok ? parseSyncedState(await res.json()) : null;
    if (!state) return false;
    adoptSyncedState(state);
    installAccountSync(deps);
    markMerged();
    return true;
  } catch {
    return false;
  }
}

/* The merge has to run once per browser per sign-in; until it has, pages run it again. */
export const MERGED_KEY = "unseenbd.account.merged";

function markMerged() {
  try {
    window.localStorage.setItem(MERGED_KEY, String(getAccount().user?.id ?? ""));
  } catch {
    // storage blocked: the merge simply runs again next time (it is idempotent)
  }
}

/** True when this browser has already merged into the signed-in account. */
export function alreadyMerged(): boolean {
  try {
    return window.localStorage.getItem(MERGED_KEY) === String(getAccount().user?.id ?? "-");
  } catch {
    return false;
  }
}

/** True when this browser merged into some account and has not forgotten it. */
export function alreadyMergedAnyone(): boolean {
  try {
    return window.localStorage.getItem(MERGED_KEY) !== null;
  } catch {
    return false;
  }
}

export function forgetMerged() {
  try {
    window.localStorage.removeItem(MERGED_KEY);
  } catch {
    // ignore
  }
}

/** The session ended elsewhere (401): stop syncing and forget the local copies. */
function handleSessionEnded() {
  forgetMerged();
  clearLocalCopies();
  setGuest();
}
