import type { Metadata } from "next";
import { localePath, type Locale } from "@/i18n/locales";

/** Generic OpenGraph image (1200 × 630) for pages that have no picture of their own: Bengali or English. */
export function ogImages(
  locale: Locale,
): NonNullable<NonNullable<Metadata["openGraph"]>["images"]> {
  const lang = locale === "bn" ? "bn" : "en";
  return [
    {
      url: `/social/og-default-${lang}.png`,
      width: 1200,
      height: 630,
      alt: "Unseen BD",
    },
  ];
}

/**
 * Canonical URL and hreflang alternates for a page (MASTER_PROMPT §7: bn, en, x-default=en).
 * `path` is written without a locale prefix, e.g. "/" or "/explore".
 */
export function alternatesFor(locale: Locale, path = "/"): Metadata["alternates"] {
  return {
    canonical: localePath(locale, path),
    languages: {
      bn: localePath("bn", path),
      en: localePath("en", path),
      "x-default": localePath("en", path),
    },
  };
}
