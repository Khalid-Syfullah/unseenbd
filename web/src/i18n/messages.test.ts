import { describe, expect, it } from "vitest";
import { LOCALES } from "./locales";
import { getT, MESSAGES } from "./messages";
import { createTranslator, isPluralForms, type MessageKey } from "./translate";

/** Leaf paths of a catalog; plural entries count as one leaf. */
function leaves(node: unknown, prefix = ""): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(path, [v]);
    else if (isPluralForms(v)) out.set(path, Object.values(v));
    else for (const [p, s] of leaves(v, path)) out.set(p, s);
  }
  return out;
}

const placeholders = (texts: string[]) =>
  [...new Set(texts.flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort();

describe("message catalogs", () => {
  const reference = leaves(MESSAGES.en);

  it.each(LOCALES)("%s has exactly the English keys, all non-empty", (locale) => {
    const catalog = leaves(MESSAGES[locale]);
    expect([...catalog.keys()].sort()).toEqual([...reference.keys()].sort());
    for (const [key, texts] of catalog) {
      for (const text of texts) expect(text.trim(), `${locale}:${key}`).not.toBe("");
    }
  });

  it.each(LOCALES)("%s uses the same placeholders as English", (locale) => {
    const catalog = leaves(MESSAGES[locale]);
    for (const [key, texts] of reference) {
      expect(placeholders(catalog.get(key) ?? []), `${locale}:${key}`).toEqual(placeholders(texts));
    }
  });

  it("translates the navigation in every locale", () => {
    const explore = LOCALES.map((l) => getT(l)("nav.explore"));
    expect(new Set(explore).size).toBe(LOCALES.length);
  });
});

describe("t()", () => {
  it("looks up dotted keys", () => {
    expect(getT("en")("nav.explore")).toBe("Explore");
    expect(getT("bn")("nav.explore")).toBe("ঘুরে দেখুন");
    expect(getT("ja")("theme.dark")).toBe("ダーク");
  });

  it("fills placeholders and formats numbers for the locale", () => {
    expect(getT("en")("common.pageOf", { page: 2, pages: 11 })).toBe("Page 2 of 11");
    expect(getT("bn")("common.pageOf", { page: 2, pages: 11 })).toBe("পাতা ২ / ১১");
    expect(getT("en")("common.asOf", { date: "8 October 2026" })).toBe("As of 8 October 2026");
  });

  it("picks plural forms by count", () => {
    const en = getT("en");
    expect(en("common.places", { count: 1 })).toBe("1 place");
    expect(en("common.places", { count: 257 })).toBe("257 places");
    expect(en("common.places", { count: 1200 })).toBe("1,200 places");
    expect(getT("bn")("common.places", { count: 1 })).toBe("১টি জায়গা");
    expect(getT("bn")("common.places", { count: 257 })).toBe("২৫৭টি জায়গা");
    expect(getT("fr")("common.places", { count: 0 })).toBe("0 lieu");
  });

  it("returns the key for unknown or non-leaf keys and keeps unknown placeholders", () => {
    const t = getT("en");
    expect(t("nope.missing" as MessageKey)).toBe("nope.missing");
    expect(t("nav" as MessageKey)).toBe("nav");
    expect(t("common.pageOf", { page: 1 })).toBe("Page 1 of {pages}");
  });

  it("works with any catalog (as the client provider uses it)", () => {
    const t = createTranslator("de", MESSAGES.de);
    expect(t("common.results", { count: 1 })).toBe("1 Ergebnis");
    expect(t("common.results", { count: 3 })).toBe("3 Ergebnisse");
  });
});
