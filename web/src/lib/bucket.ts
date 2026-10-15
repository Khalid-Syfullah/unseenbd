/**
 * The bucket list: for each place, whether a visitor wants to see it or has been there. It lives
 * in their own browser (localStorage) for now, as a JSON object `{ [placeSlug]: "want" | "been" }`.
 * Signed-in sync arrives with accounts; everything goes through this module so that change stays
 * in one place.
 */
import { useSyncExternalStore } from "react";

export const BUCKET_KEY = "unseenbd.bucket";

export type BucketStatus = "want" | "been";
export type Bucket = Readonly<Record<string, BucketStatus>>;

const EMPTY: Bucket = Object.freeze({});

/** Parse the stored value into a clean map; anything malformed is an empty list. */
export function parseBucket(raw: string | null | undefined): Record<string, BucketStatus> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Record<string, BucketStatus> = {};
    for (const [slug, status] of Object.entries(value)) {
      if (status === "want" || status === "been") out[slug] = status;
    }
    return out;
  } catch {
    return {};
  }
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

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(BUCKET_KEY);
  } catch {
    return null; // private window, blocked storage
  }
}

function writeRaw(bucket: Bucket) {
  try {
    if (Object.keys(bucket).length) window.localStorage.setItem(BUCKET_KEY, JSON.stringify(bucket));
    else window.localStorage.removeItem(BUCKET_KEY);
  } catch {
    // storage is blocked; the change lives only until the page closes
  }
}

let cachedRaw: string | null | undefined;
let cached: Bucket = EMPTY;
/** Used while storage cannot be written, so the page still reacts to clicks. */
let memory: Bucket | null = null;

const listeners = new Set<() => void>();

function getSnapshot(): Bucket {
  if (memory) return memory;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    const parsed = parseBucket(raw);
    cached = Object.keys(parsed).length ? parsed : EMPTY;
  }
  return cached;
}

function getServerSnapshot(): Bucket {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === BUCKET_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Marks (or clears) a place. */
export function setBucketStatus(slug: string, status: BucketStatus) {
  const next = toggled(getSnapshot(), slug, status);
  writeRaw(next);
  // If the write did not stick, keep the change in memory.
  memory = readRaw() === (Object.keys(next).length ? JSON.stringify(next) : null) ? null : next;
  for (const listener of listeners) listener();
}

/** The bucket list. Empty on the server and during hydration, then the saved one. */
export function useBucket(): Bucket {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
