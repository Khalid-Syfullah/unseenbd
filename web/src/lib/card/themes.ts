import themesJson from "@assets/card-themes/themes.json";
import { THEME_KEYS, type ThemeKey } from "./types";

/** A card colour theme from `assets/card-themes/themes.json`. */
export type CardTheme = {
  key: ThemeKey;
  nameEn: string;
  nameBn: string;
  /** Background gradient, top-left to bottom-right. */
  bg: readonly [string, string];
  land: string;
  visited: string;
  border: string;
  text: string;
  accent: string;
  /** Draw the jamdani motif over the background. */
  pattern: boolean;
  /** Preview image (`/card-themes/{key}.svg`). */
  preview: string;
};

type ThemeRow = {
  key: string;
  name_en: string;
  name_bn: string;
  bg: string[];
  land: string;
  visited: string;
  border: string;
  text: string;
  accent: string;
  pattern?: boolean;
};

const isThemeKey = (v: string): v is ThemeKey => (THEME_KEYS as readonly string[]).includes(v);

/** The six themes in file order: Dusk, Dawn, Jamdani, Padma, Earth, Mist. */
export const CARD_THEMES: readonly CardTheme[] = (themesJson as ThemeRow[])
  .filter((t) => isThemeKey(t.key))
  .map((t) => ({
    key: t.key as ThemeKey,
    nameEn: t.name_en,
    nameBn: t.name_bn,
    bg: [t.bg[0] ?? "#FBF6EC", t.bg[1] ?? t.bg[0] ?? "#F1E6D0"] as const,
    land: t.land,
    visited: t.visited,
    border: t.border,
    text: t.text,
    accent: t.accent,
    pattern: t.pattern === true,
    preview: `/card-themes/${t.key}.svg`,
  }));

const BY_KEY = new Map(CARD_THEMES.map((t) => [t.key, t]));

export function cardTheme(key: string): CardTheme {
  return BY_KEY.get(key as ThemeKey) ?? CARD_THEMES[0]!;
}

/** Division colours (DESIGN.md §2.1), for "coloured districts". */
export const DIVISION_COLOURS: Readonly<Record<string, string>> = {
  rangpur: "#E3B04B",
  rajshahi: "#D9824B",
  mymensingh: "#9A7CC0",
  sylhet: "#3FA37F",
  dhaka: "#D2584A",
  khulna: "#2F8A6A",
  barishal: "#3E98C0",
  chattogram: "#5B7DBE",
};

/** Relative luminance of a `#RRGGBB` colour (0 black – 1 white). */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** True when the theme's background is dark (light text). */
export function isDarkTheme(theme: CardTheme): boolean {
  return luminance(theme.bg[0]) < 0.25;
}

/** `#RRGGBB` plus alpha → `rgba(…)`. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
