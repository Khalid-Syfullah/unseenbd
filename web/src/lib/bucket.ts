/**
 * The bucket list: for each place, whether a visitor wants to see it or has been there. It lives
 * in their own browser (localStorage) as a JSON object `{ [placeSlug]: "want" | "been" }`, stays
 * in step across tabs, and, once they sign in, is mirrored to their account through a sync
 * adapter (like the visited districts).
 */
import { diffMap, unionBucket, type MapDelta } from "@/lib/account/merge";
import { cleanBucket, type BucketStatus } from "@/lib/account/shapes";
import { createLocalStore, safeJson } from "@/lib/visited/store";
import { adapterSlot, type SyncAdapter } from "@/lib/visited/sync";

export const BUCKET_KEY = "unseenbd.bucket";

export { isPlaceSlug, type BucketStatus } from "@/lib/account/shapes";
export type Bucket = Readonly<Record<string, BucketStatus>>;

const EMPTY: Bucket = Object.freeze({});

/** Parse the stored value into a clean map; anything malformed is an empty list. */
export function parseBucket(raw: string | null | undefined): Record<string, BucketStatus> {
  return raw ? cleanBucket(safeJson(raw)) : {};
}

/** The bucket after toggling `status` on `slug`: choosing the current status clears it. */
export function toggled(bucket: Bucket, slug: string, status: BucketStatus): Bucket {
  const next = { ...bucket };
  if (next[slug] === status) delete next[slug];
  else next[slug] = status;
  return next;
}

/** How many places are marked `been`, and how many `want`. */
export function bucketCounts(bucket: Bucket): { been: number; want: number } {
  let been = 0;
  let want = 0;
  for (const status of Object.values(bucket)) {
    if (status === "been") been += 1;
    else want += 1;
  }
  return { been, want };
}

const store = createLocalStore<Bucket>({
  key: BUCKET_KEY,
  empty: EMPTY,
  parse: (raw) => {
    const bucket = parseBucket(raw);
    return Object.keys(bucket).length ? Object.freeze(bucket) : EMPTY;
  },
  serialize: (bucket) => (Object.keys(bucket).length ? JSON.stringify(bucket) : null),
});

/** Places newly marked (with their status) and places cleared. */
export type BucketDelta = MapDelta<BucketStatus>;
export type BucketSyncAdapter = SyncAdapter<BucketDelta, Bucket>;

const sync = adapterSlot<BucketDelta, Bucket>({
  get: () => store.get(),
  merge: (remote) => write(unionBucket(store.get(), parseBucket(JSON.stringify(remote))), false),
  replace: (remote) => write(parseBucket(JSON.stringify(remote)), false),
});

/** Installs the account adapter (on sign-in); the default does nothing. */
export function setBucketSyncAdapter(adapter: BucketSyncAdapter) {
  sync.install(adapter);
}

function write(next: Record<string, BucketStatus>, push: boolean) {
  const delta = diffMap(store.get(), next);
  if (!Object.keys(delta.set).length && !delta.clear.length) return;
  store.set(Object.keys(next).length ? Object.freeze(next) : EMPTY);
  if (push) sync.push(delta);
}

/** Marks (or clears) a place. */
export function setBucketStatus(slug: string, status: BucketStatus) {
  write({ ...toggled(store.get(), slug, status) }, true);
}

/** The bucket list right now (empty on the server). */
export function getBucket(): Bucket {
  return store.get();
}

/** Forgets the local copy without telling the account (on sign-out). */
export function clearBucketLocal() {
  write({}, false);
}

/** Takes the account's bucket list as the local value, without pushing it back (after sign-in). */
export function adoptBucket(bucket: Bucket) {
  write(parseBucket(JSON.stringify(bucket)), false);
}

/** The bucket list. Empty on the server and during hydration, then the saved one. */
export function useBucket(): Bucket {
  return store.use();
}
