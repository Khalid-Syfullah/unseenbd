/**
 * The shapes of the personal stores, without any browser code, so the server can validate what
 * the browser sends with exactly the rules the stores use (`src/lib/bucket.ts`,
 * `src/lib/visited/world.ts`, `src/lib/visited/story.ts` re-export these).
 */

/* -- story ------------------------------------------------------------------------------------ */

export const STORY_FIELDS = ["birth", "upbringing", "study", "work", "favourite"] as const;
export type StoryField = (typeof STORY_FIELDS)[number];

export function isStoryField(value: unknown): value is StoryField {
  return typeof value === "string" && (STORY_FIELDS as readonly string[]).includes(value);
}

/* -- bucket list ------------------------------------------------------------------------------ */

export type BucketStatus = "want" | "been";

export const isBucketStatus = (v: unknown): v is BucketStatus => v === "want" || v === "been";

/** A place slug as stored (lower-case words joined by hyphens). */
export function isPlaceSlug(value: unknown): value is string {
  return (
    typeof value === "string" && value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

/** `{slug: status}` entries with a valid status (keys are not checked). */
export function cleanBucket(value: unknown): Record<string, BucketStatus> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, BucketStatus> = {};
  for (const [slug, status] of Object.entries(value))
    if (isBucketStatus(status)) out[slug] = status;
  return out;
}

/* -- world ------------------------------------------------------------------------------------ */

export type WorldMark = "visited" | "wish";

export const isWorldMark = (v: unknown): v is WorldMark => v === "visited" || v === "wish";

/** An ISO2 code (`BD`) or a map slug (`n-cyprus`). */
export function isCountryKey(value: unknown): value is string {
  return typeof value === "string" && /^(?:[A-Z]{2}|[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(value);
}

/** `{country: mark}` entries with a valid key and mark. */
export function cleanWorld(value: unknown): Record<string, WorldMark> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, WorldMark> = {};
  for (const [key, mark] of Object.entries(value)) {
    if (isCountryKey(key) && isWorldMark(mark)) out[key] = mark;
  }
  return out;
}
