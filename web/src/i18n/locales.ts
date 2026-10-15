/**
 * Locale scheme
 *
 * - `bn` is the default and lives at the un-prefixed URL (`/`, `/explore`). Internally the
 *   middleware rewrites those paths to `/bn/…` so every page sits under `src/app/[lang]/`.
 * - `en` lives at `/en/…`.
 * - `zh fr de it ja` are interface-only locales at `/zh/…` etc.: the interface strings are
 *   translated, content (place and district text) falls back to English.
 */
export const LOCALES = ["bn", "en", "zh", "fr", "de", "it", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

/** Locales that have their own content. Every other locale reads English content. */
export const CONTENT_LOCALES = ["bn", "en"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "bn";

/** Locales that appear as a URL prefix (everything except the default). */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

/** Each locale's name in its own language, for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  bn: "বাংলা",
  en: "English",
  zh: "中文",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
};

/** BCP 47 tags for `<html lang>` and `hreflang`. */
export const HTML_LANG: Record<Locale, string> = {
  bn: "bn",
  en: "en",
  zh: "zh-Hans",
  fr: "fr",
  de: "de",
  it: "it",
  ja: "ja",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The language content is shown in for a given interface locale. */
export function contentLocale(locale: Locale): ContentLocale {
  return locale === "bn" ? "bn" : "en";
}

/**
 * The public URL of `path` (written without a locale, starting with `/`) in `locale`.
 * `localePath("bn", "/explore")` → `/explore`, `localePath("en", "/")` → `/en`.
 */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
