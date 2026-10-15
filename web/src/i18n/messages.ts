/**
 * All message catalogs, for server code (pages, layouts, metadata, route handlers).
 * Client components get their locale's catalog through `<I18nProvider>` and `useT()` instead of
 * importing this file.
 */
import bn from "./bn.json";
import de from "./de.json";
import en from "./en.json";
import fr from "./fr.json";
import it from "./it.json";
import ja from "./ja.json";
import type { Locale } from "./locales";
import { createTranslator, type Messages, type Translator } from "./translate";
import zh from "./zh.json";

export const MESSAGES: Record<Locale, Messages> = { bn, en, zh, fr, de, it, ja };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

const cache = new Map<Locale, Translator>();

/** The `t()` function for a locale (server side). */
export function getT(locale: Locale): Translator {
  let t = cache.get(locale);
  if (!t) {
    t = createTranslator(locale, MESSAGES[locale]);
    cache.set(locale, t);
  }
  return t;
}

export type { MessageKey, Messages, Translator } from "./translate";
