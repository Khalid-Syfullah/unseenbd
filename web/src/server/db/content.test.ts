// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDataDir } from "../paths";
import { migrateDatabase, openDatabase, type Db } from "./client";
import { seedDatabase } from "./seed";

/*
 * The original place and district prose in `data/content/*.json`: complete in both languages,
 * free of text lifted from the old site, and loaded into the bilingual columns by the seed.
 */

type Text = Record<string, string | string[]>;
type Entry = { slug: string; reviewed: boolean; bn: Text; en: Text };

const readData = <T>(file: string): T =>
  JSON.parse(readFileSync(join(seedDataDir(), file), "utf8")) as T;

const places = readData<{ slug: string }[]>("places.json");
const districts = readData<{ slug: string }[]>("districts.json");
const placeText = readData<Entry[]>("content/places.json");
const districtText = readData<Entry[]>("content/districts.json");

const FORBIDDEN = ["unseenbd.com", "অদেখা বাংলা"];
const BENGALI_DIGITS = /[০-৯]/;
const WESTERN_DIGITS = /[0-9]/;

const strings = (text: Text): string[] => Object.values(text).flat();
/** Whitespace-separated tokens that hold a letter or digit (a lone dash is not a word). */
const words = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

describe.each([
  {
    name: "places",
    entries: placeText,
    slugs: places.map((p) => p.slug),
    fields: { description: [40, 70], how_to_get_there: [25, 50] },
    lists: ["tips", "warnings"],
  },
  {
    name: "districts",
    entries: districtText,
    slugs: districts.map((d) => d.slug),
    fields: { intro: [40, 60], how_to_reach: [20, 40] },
    lists: [],
  },
])("content/$name.json", ({ entries, slugs, fields, lists }) => {
  it("has exactly one entry for every slug", () => {
    expect(entries.map((e) => e.slug).sort()).toEqual([...slugs].sort());
  });

  it("has non-empty Bengali and English text of the right length", () => {
    for (const e of entries) {
      expect(typeof e.reviewed, e.slug).toBe("boolean");
      for (const lang of ["bn", "en"] as const) {
        const block = e[lang];
        expect(Object.keys(block).sort(), `${e.slug}.${lang}`).toEqual(
          [...Object.keys(fields), ...lists].sort(),
        );
        for (const [field, [min, max]] of Object.entries(fields)) {
          const value = block[field];
          expect(typeof value, `${e.slug}.${lang}.${field}`).toBe("string");
          const n = words(value as string);
          expect(n, `${e.slug}.${lang}.${field} word count`).toBeGreaterThanOrEqual(min);
          expect(n, `${e.slug}.${lang}.${field} word count`).toBeLessThanOrEqual(max);
        }
        for (const s of strings(block)) expect(s.trim(), `${e.slug}.${lang}`).not.toBe("");
      }
    }
  });

  it("never mentions the old site", () => {
    for (const e of entries) {
      for (const s of [...strings(e.bn), ...strings(e.en)]) {
        for (const bad of FORBIDDEN) expect(s.includes(bad), `${e.slug}: ${bad}`).toBe(false);
      }
    }
  });

  it("uses Bengali numerals in Bengali and Western numerals in English", () => {
    for (const e of entries) {
      for (const s of strings(e.bn))
        expect(WESTERN_DIGITS.test(s), `${e.slug}.bn: ${s}`).toBe(false);
      for (const s of strings(e.en))
        expect(BENGALI_DIGITS.test(s), `${e.slug}.en: ${s}`).toBe(false);
    }
  });
});

describe("place tips and warnings", () => {
  it("has 2–3 tips and 0–2 warnings, the same number in both languages", () => {
    for (const e of placeText) {
      for (const lang of ["bn", "en"] as const) {
        const tips = e[lang].tips as string[];
        const warnings = e[lang].warnings as string[];
        expect(tips.length, `${e.slug}.${lang}.tips`).toBeGreaterThanOrEqual(2);
        expect(tips.length, `${e.slug}.${lang}.tips`).toBeLessThanOrEqual(3);
        expect(warnings.length, `${e.slug}.${lang}.warnings`).toBeLessThanOrEqual(2);
      }
      expect(e.bn.tips.length, e.slug).toBe(e.en.tips.length);
      expect(e.bn.warnings.length, e.slug).toBe(e.en.warnings.length);
    }
  });
});

describe("seeding the content", () => {
  let db: Db;

  beforeAll(() => {
    db = openDatabase(":memory:");
    migrateDatabase(db);
    seedDatabase(db);
  });

  afterAll(() => db.$client.close());

  const missing = (sql: string) => (db.$client.prepare(sql).get() as { n: number }).n;

  it("fills every place's bilingual columns", () => {
    expect(
      missing(`SELECT count(*) AS n FROM places WHERE
        coalesce(description_bn, '') = '' OR coalesce(description_en, '') = '' OR
        coalesce(how_to_get_there_bn, '') = '' OR coalesce(how_to_get_there_en, '') = '' OR
        tips_bn IS NULL OR tips_en IS NULL OR warnings_bn IS NULL OR warnings_en IS NULL`),
    ).toBe(0);
  });

  it("fills every district's bilingual columns", () => {
    expect(
      missing(`SELECT count(*) AS n FROM districts WHERE
        coalesce(intro_bn, '') = '' OR coalesce(intro_en, '') = '' OR
        coalesce(how_to_reach_bn, '') = '' OR coalesce(how_to_reach_en, '') = ''`),
    ).toBe(0);
  });

  it("stores the text from the content files", () => {
    const row = db.$client
      .prepare("SELECT description_en, tips_bn FROM places WHERE slug = 'nilgiri-hill'")
      .get() as { description_en: string; tips_bn: string };
    const entry = placeText.find((e) => e.slug === "nilgiri-hill")!;
    expect(row.description_en).toBe(entry.en.description);
    expect(JSON.parse(row.tips_bn)).toEqual(entry.bn.tips);
  });
});
