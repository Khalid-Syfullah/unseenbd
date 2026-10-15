import type { Metadata } from "next";
import { localePath, type Locale } from "@/i18n/locales";

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
