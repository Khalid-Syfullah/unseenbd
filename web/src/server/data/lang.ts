import { contentLocale, isLocale, type ContentLocale } from "@/i18n/locales";

/** Content language of a data-layer result: Bengali or English. */
export type Lang = ContentLocale;

/**
 * The content language for any locale or `?lang=` value. `bn` stays Bengali; `en` and the
 * interface-only locales (zh, fr, de, it, ja) read English; anything unknown gets `fallback`.
 */
export function toLang(value: unknown, fallback: Lang = "bn"): Lang {
  return isLocale(value) ? contentLocale(value) : fallback;
}

/**
 * Pick the field for `lang`, falling back to English, then to Bengali. Empty strings and empty
 * arrays count as missing.
 */
export function pick<T>(lang: Lang, bn: T | null | undefined, en: T | null | undefined): T | null {
  const present = (v: T | null | undefined): v is T =>
    v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  if (lang === "bn" && present(bn)) return bn;
  if (present(en)) return en;
  if (present(bn)) return bn;
  return null;
}
