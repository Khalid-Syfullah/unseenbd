/**
 * The `t()` helper, shared by server and client. Pure: it takes a catalog and returns a
 * translator, so the client never has to import catalogs it does not use.
 *
 * - Keys are dotted paths into the catalog (`"nav.explore"`), checked by TypeScript.
 * - `{name}` placeholders are filled from `vars`; numbers are formatted for the locale
 *   (Bengali numerals in `bn`).
 * - A plural entry is an object of CLDR categories (`{ "one": "…", "other": "…" }`) chosen by
 *   `vars.count`; a missing category falls back to `other`.
 * - Names of districts, divisions, kinds and months come from the data layer, not from here.
 */
import { formatNumber } from "@/lib/format";
import type en from "./en.json";
import { HTML_LANG, type Locale } from "./locales";

type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";
export type PluralForms = { other: string } & Partial<Record<PluralCategory, string>>;

type Widen<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends { other: string }
      ? PluralForms
      : Widen<T[K]>;
};

/** The shape every catalog must have (taken from `en.json`). */
export type Messages = Widen<typeof en>;

type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends { other: string }
      ? `${P}${K}`
      : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every translatable key, e.g. `"nav.explore"` or `"common.places"`. */
export type MessageKey = Paths<typeof en>;

export type MessageVars = Record<string, string | number>;
export type Translator = (key: MessageKey, vars?: MessageVars) => string;

const PLURAL_KEYS = new Set<string>(["zero", "one", "two", "few", "many", "other"]);

/** True for a plural entry: an object whose keys are all CLDR categories, including `other`. */
export function isPluralForms(value: unknown): value is PluralForms {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.includes("other") && keys.every((k) => PLURAL_KEYS.has(k));
}

function lookup(messages: Messages, key: string): unknown {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export function createTranslator(locale: Locale, messages: Messages): Translator {
  const plurals = new Intl.PluralRules(HTML_LANG[locale]);
  return (key, vars) => {
    const entry = lookup(messages, key);
    let template: string;
    if (typeof entry === "string") {
      template = entry;
    } else if (isPluralForms(entry)) {
      const count = vars?.count;
      const category = typeof count === "number" ? plurals.select(count) : "other";
      template = entry[category] ?? entry.other;
    } else {
      return key;
    }
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = vars[name];
      if (value === undefined) return match;
      return typeof value === "number" ? formatNumber(value, locale, { maxDecimals: 2 }) : value;
    });
  };
}
