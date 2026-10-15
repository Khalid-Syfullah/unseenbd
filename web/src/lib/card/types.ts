/**
 * Types for the share-card maker (MASTER_PROMPT §5.7, DESIGN.md §4.11). The renderer in this
 * folder is plain TypeScript and canvas: no React, so it can be tested and reused by both
 * My Bangladesh and My World.
 */

export const CARD_TYPES = ["map", "level", "passport"] as const;
/** Map / Level / Passport (`reference.json` → `share_card.types_en`). */
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_SIZE_KEYS = ["link", "post", "square", "story"] as const;
/** Link preview 1.91:1 · Post 4:5 · Square 1:1 · Story 9:16. */
export type CardSizeKey = (typeof CARD_SIZE_KEYS)[number];

export const LABEL_SIZES = ["hidden", "small", "medium", "large"] as const;
/** How big the district (or country) names are drawn on the map. */
export type LabelSize = (typeof LABEL_SIZES)[number];

export const THEME_KEYS = ["dusk", "dawn", "jamdani", "padma", "earth", "mist"] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

/** Which map the card draws. */
export type CardMapKind = "bangladesh" | "world";

export type CardOptions = {
  /** Visited districts in their division colours instead of the theme's single colour. */
  colouredDistricts: boolean;
  /** Visited districts filled with a place cover from that district (wins over colours). */
  districtPhotos: boolean;
  /** Fit the map around the hometown instead of the whole country. */
  zoomHometown: boolean;
};

/** A trip pin: a region key (district slug or country key), an ISO date (or ""), a short note. */
export type TripPin = { region: string; date: string; note: string };

/**
 * Words drawn on the card, already translated by the caller (the renderer never picks a
 * language itself, except for the numerals in pin dates, which follow `lang`).
 */
export type CardText = {
  /** "Rahim's Bangladesh" / "My world". */
  title: string;
  /** The big number line: "13 / 64" or "27". */
  count: string;
  /** Under the number: "districts visited · 20%". */
  countLabel: string;
  /** "Home: Sylhet" (empty when there is no hometown). */
  home: string;
  /** Level card: the level reached ("Bangladesh Explorer") or "Not ranked yet". */
  levelTitle: string;
  /** Level card: "12 more to Bangladesh Traveller" or "Every district visited". */
  levelNext: string;
  /** Passport card: the disclaimer line. */
  passportNote: string;
  /** Passport card: "+{count}" for stamps that do not fit. */
  passportMore: string;
  /** Passport card with no stamps. */
  passportEmpty: string;
  /** Region names by key, for labels and pins. */
  regionNames: Readonly<Record<string, string>>;
};

/** Everything that decides how a card looks. */
export type CardInput = {
  map: CardMapKind;
  type: CardType;
  theme: ThemeKey;
  size: CardSizeKey;
  /** Visited region keys (district slugs or country keys), in the order they fill in. */
  visitedIds: readonly string[];
  /** World map only: countries on the wish list. */
  wishIds?: readonly string[];
  /** Display name (may be empty). Already part of `text.title`; kept for callers and tests. */
  name: string;
  caption: string;
  /** Region key of the hometown, or null. */
  hometown: string | null;
  labelSize: LabelSize;
  options: CardOptions;
  pins: readonly TripPin[];
  /** The visitor's own photo (drawn in a circle), or null. */
  photo: CanvasImageSource | null;
  /** 0–1: share of the progress bar on the level card (towards the next level). */
  progress: number;
  /** Level card: false while no level is reached yet (the badge is drawn faded). */
  levelReached?: boolean;
  /** Interface language, for numerals in dates. */
  lang: string;
  /** The small URL line at the bottom ("unseenbd.example/my-bangladesh"). */
  url: string;
  text: CardText;
};

/** Images the renderer draws; any of them may be missing (the card still renders). */
export type CardAssets = {
  /** The Unseen BD mark (`/brand/logo-mark.svg`). */
  logo?: CanvasImageSource | null;
  /** The level badge for the level card. */
  badge?: CanvasImageSource | null;
  /** Passport stamps by district slug. */
  stamps?: ReadonlyMap<string, CanvasImageSource>;
  /** Place covers by district slug, for "district photos". */
  covers?: ReadonlyMap<string, CanvasImageSource>;
};

/** One animation frame. The static card is `{ fill: 1, tilt: 0, spin: 0 }`. */
export type CardFrame = {
  /** 0–1: how many of the visited regions (or stamps) are filled in. */
  fill: number;
  /** Radians the visual leans back around the horizontal axis (3D tilt). */
  tilt: number;
  /** Radians the visual has turned around the vertical axis (360° spin). */
  spin: number;
};

export const STATIC_FRAME: CardFrame = Object.freeze({ fill: 1, tilt: 0, spin: 0 });

/** Font stacks resolved from the page (next/font family names). */
export type CardFonts = { ui: string; display: string };
