/**
 * "My Bangladesh story" (the districts of birth, upbringing, study, work and a favourite) and the
 * display name typed into the share panel. Both are kept in the visitor's own browser; the story
 * is also mirrored to the account once they sign in. Each answer remembers when it last changed
 * (`unseenbd.story.times`) so two devices settle on the newest answer (last write wins).
 */
import type { StoryState } from "@/lib/account/merge";
import { isStoryField, STORY_FIELDS, type StoryField } from "@/lib/account/shapes";
import { isDistrictId } from "./districts";
import { MAX_NAME_LENGTH } from "./encode";
import { createLocalStore, safeJson } from "./store";
import { adapterSlot, type SyncAdapter } from "./sync";

export const STORY_KEY = "unseenbd.story";
export const STORY_TIMES_KEY = "unseenbd.story.times";
export const SHARE_NAME_KEY = "unseenbd.shareName";

export { isStoryField, STORY_FIELDS, type StoryField } from "@/lib/account/shapes";
export type Story = Readonly<Partial<Record<StoryField, number>>>;

const EMPTY_STORY: Story = Object.freeze({});

export function parseStory(raw: string | null | undefined): Partial<Record<StoryField, number>> {
  if (!raw) return {};
  const value = safeJson(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Partial<Record<StoryField, number>> = {};
  for (const field of STORY_FIELDS) {
    const id = (value as Record<string, unknown>)[field];
    if (isDistrictId(id)) out[field] = id;
  }
  return out;
}

const storyStore = createLocalStore<Story>({
  key: STORY_KEY,
  empty: EMPTY_STORY,
  parse: (raw) => {
    const story = parseStory(raw);
    return Object.keys(story).length ? Object.freeze(story) : EMPTY_STORY;
  },
  serialize: (story) => (Object.keys(story).length ? JSON.stringify(story) : null),
});

export type StoryTimes = Readonly<Partial<Record<StoryField, number>>>;
const EMPTY_TIMES: StoryTimes = Object.freeze({});

/** Parses the stored change times (ms since epoch); anything malformed is dropped. */
export function parseStoryTimes(
  raw: string | null | undefined,
): Partial<Record<StoryField, number>> {
  if (!raw) return {};
  const value = safeJson(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Partial<Record<StoryField, number>> = {};
  for (const [field, at] of Object.entries(value)) {
    if (isStoryField(field) && Number.isFinite(at) && (at as number) > 0) out[field] = at as number;
  }
  return out;
}

const timesStore = createLocalStore<StoryTimes>({
  key: STORY_TIMES_KEY,
  empty: EMPTY_TIMES,
  parse: (raw) => {
    const times = parseStoryTimes(raw);
    return Object.keys(times).length ? Object.freeze(times) : EMPTY_TIMES;
  },
  serialize: (times) => (Object.keys(times).length ? JSON.stringify(times) : null),
});

/** The story with its change times, as the account sync sends it (cleared answers are `null`). */
export function getStoryState(): StoryState {
  const story = storyStore.get();
  const times = timesStore.get();
  const values: StoryState["values"] = {};
  for (const field of STORY_FIELDS) {
    if (story[field] !== undefined) values[field] = story[field]!;
    else if (times[field] !== undefined) values[field] = null;
  }
  return { values, times: { ...times } };
}

function writeState(state: StoryState) {
  const story: Partial<Record<StoryField, number>> = {};
  const times: Partial<Record<StoryField, number>> = {};
  for (const field of STORY_FIELDS) {
    const id = state.values[field];
    if (isDistrictId(id)) story[field] = id;
    const at = state.times[field];
    if (typeof at === "number" && at > 0) times[field] = at;
  }
  storyStore.set(Object.freeze(story));
  timesStore.set(Object.freeze(times));
}

/** One changed answer (`null` = cleared) with the time it changed. */
export type StoryDelta = StoryState;
export type StorySyncAdapter = SyncAdapter<StoryDelta, StoryState>;

const sync = adapterSlot<StoryDelta, StoryState>({
  get: getStoryState,
  // Newest answer wins, field by field.
  merge: (remote) => {
    const local = getStoryState();
    const out: StoryState = { values: { ...local.values }, times: { ...local.times } };
    for (const field of STORY_FIELDS) {
      const tr = remote.times[field] ?? -1;
      const tl = local.times[field] ?? -1;
      if (field in remote.values && tr > tl) {
        out.values[field] = remote.values[field] ?? null;
        if (remote.times[field] !== undefined) out.times[field] = remote.times[field];
      }
    }
    writeState(out);
  },
  replace: (remote) => writeState(remote),
});

/** Installs the account adapter (on sign-in); the default does nothing. */
export function setStorySyncAdapter(adapter: StorySyncAdapter) {
  sync.install(adapter);
}

/** Sets one answer (`null` clears it). */
export function setStoryDistrict(field: StoryField, id: number | null) {
  const next: Partial<Record<StoryField, number>> = { ...storyStore.get() };
  const value = id !== null && isDistrictId(id) ? id : null;
  if (value !== null) next[field] = value;
  else delete next[field];
  // Strictly increasing, so two quick changes never share a time.
  const at = Math.max(Date.now(), (timesStore.get()[field] ?? 0) + 1);
  storyStore.set(Object.freeze(next));
  timesStore.set(Object.freeze({ ...timesStore.get(), [field]: at }));
  sync.push({ values: { [field]: value }, times: { [field]: at } });
}

/** Takes the account's story as the local value, without pushing it back (after sign-in). */
export function adoptStory(state: StoryState) {
  writeState(state);
}

/** Forgets the local story without telling the account (on sign-out). */
export function clearStoryLocal() {
  storyStore.set(EMPTY_STORY);
  timesStore.set(EMPTY_TIMES);
}

export function useStory(): Story {
  return storyStore.use();
}

/** Strips what a name may never hold, but keeps spaces so typing feels normal. */
function typedName(value: string): string {
  return [...value.replace(/[\u0000-\u001f\u007f<>]/g, "")].slice(0, MAX_NAME_LENGTH).join("");
}

const nameStore = createLocalStore<string>({
  key: SHARE_NAME_KEY,
  empty: "",
  parse: typedName,
  serialize: (name) => (name ? name : null),
});

/** Remembers the name typed in the share panel (raw, so typing spaces works). */
export function setShareName(name: string) {
  nameStore.set(typedName(name));
}

export function useShareName(): string {
  return nameStore.use();
}
