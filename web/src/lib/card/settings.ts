/**
 * The card maker's choices (type, theme, size, caption, trip pins, …), remembered in this
 * browser so a visitor can come back and post another size. The photo is never stored.
 */
import {
  CARD_SIZE_KEYS,
  CARD_TYPES,
  LABEL_SIZES,
  THEME_KEYS,
  type CardSizeKey,
  type CardType,
  type LabelSize,
  type ThemeKey,
  type TripPin,
} from "./types";
import { POST_STYLES, type PostStyle } from "./post-text";

export type FillMode = "theme" | "coloured" | "photos";
export const FILL_MODES: readonly FillMode[] = ["theme", "coloured", "photos"];

export type CardSettings = {
  type: CardType;
  theme: ThemeKey;
  size: CardSizeKey;
  labelSize: LabelSize;
  fill: FillMode;
  zoomHometown: boolean;
  caption: string;
  /**
   * Region key, "" for none, or `"auto"` (the default): the district of birth from
   * "My Bangladesh story", when there is one.
   */
  hometown: string;
  pins: readonly TripPin[];
  postStyle: PostStyle;
  /** World: draw the travel memory pins. */
  showMemories: boolean;
};

export const MAX_CAPTION = 120;
export const MAX_TRIP_PINS = 6;
export const MAX_TRIP_NOTE = 60;

export const DEFAULT_SETTINGS: CardSettings = Object.freeze({
  type: "map",
  theme: "mist",
  size: "square",
  labelSize: "small",
  fill: "theme",
  zoomHometown: false,
  caption: "",
  hometown: "auto",
  pins: Object.freeze([]) as readonly TripPin[],
  postStyle: "short",
  showMemories: true,
});

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;

const REGION = /^(?:[A-Z]{2}|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Cleans one trip pin; null when it has no valid region. */
export function cleanTripPin(value: unknown): TripPin | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.region !== "string" || !REGION.test(v.region)) return null;
  const date = typeof v.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : "";
  const note =
    typeof v.note === "string" ? v.note.replace(/\s+/g, " ").trim().slice(0, MAX_TRIP_NOTE) : "";
  return { region: v.region, date, note };
}

/** Parses saved settings; anything unknown falls back to the default. */
export function parseCardSettings(raw: string | null | undefined): CardSettings {
  const value = raw ? safeJson(raw) : null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_SETTINGS;
  const v = value as Record<string, unknown>;
  const pins = Array.isArray(v.pins)
    ? v.pins
        .map(cleanTripPin)
        .filter((p): p is TripPin => p !== null)
        .slice(0, MAX_TRIP_PINS)
    : [];
  return {
    type: oneOf(CARD_TYPES, v.type, DEFAULT_SETTINGS.type),
    theme: oneOf(THEME_KEYS, v.theme, DEFAULT_SETTINGS.theme),
    size: oneOf(CARD_SIZE_KEYS, v.size, DEFAULT_SETTINGS.size),
    labelSize: oneOf(LABEL_SIZES, v.labelSize, DEFAULT_SETTINGS.labelSize),
    fill: oneOf(FILL_MODES, v.fill, DEFAULT_SETTINGS.fill),
    zoomHometown: v.zoomHometown === true,
    caption: typeof v.caption === "string" ? v.caption.slice(0, MAX_CAPTION) : "",
    hometown:
      v.hometown === "" || (typeof v.hometown === "string" && REGION.test(v.hometown))
        ? (v.hometown as string)
        : DEFAULT_SETTINGS.hometown,
    pins,
    postStyle: oneOf(POST_STYLES, v.postStyle, DEFAULT_SETTINGS.postStyle),
    showMemories: v.showMemories !== false,
  };
}
