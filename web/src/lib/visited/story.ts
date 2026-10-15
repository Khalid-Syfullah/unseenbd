/**
 * "My Bangladesh story" (the districts of birth, upbringing, study, work and a favourite) and the
 * display name typed into the share panel. Both are kept in the visitor's own browser only.
 */
import { isDistrictId } from "./districts";
import { MAX_NAME_LENGTH } from "./encode";
import { createLocalStore, safeJson } from "./store";

export const STORY_KEY = "unseenbd.story";
export const SHARE_NAME_KEY = "unseenbd.shareName";

export const STORY_FIELDS = ["birth", "upbringing", "study", "work", "favourite"] as const;
export type StoryField = (typeof STORY_FIELDS)[number];
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

/** Sets one answer (`null` clears it). */
export function setStoryDistrict(field: StoryField, id: number | null) {
  const next: Partial<Record<StoryField, number>> = { ...storyStore.get() };
  if (id !== null && isDistrictId(id)) next[field] = id;
  else delete next[field];
  storyStore.set(Object.freeze(next));
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
