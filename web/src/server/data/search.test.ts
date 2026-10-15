// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listPlaces, matchPlaceIds, searchAll } from "./index";

const names = (r: { places: { nameEn: string }[] }) => r.places.map((p) => p.nameEn);

describe("searchAll", () => {
  it("finds a place by its English name, in any case", async () => {
    for (const q of ["sajek", "SAJEK", "  Sajek  "]) {
      expect(names(await searchAll(q, "en"))).toContain("Sajek Valley");
    }
  });

  it("finds a place by its Bengali name", async () => {
    expect(names(await searchAll("সাজেক", "bn"))).toContain("Sajek Valley");
  });

  it("finds Bengali names from a Latin spelling and the other way round", async () => {
    const latin = await searchAll("kaptai", "bn");
    const bengali = await searchAll("কাপ্তাই", "en");
    expect(names(latin)).toContain("Kaptai Lake");
    expect(names(bengali)).toContain("Kaptai Lake");
  });

  it("ignores accents and apostrophes", async () => {
    expect(names(await searchAll("Cöx’s Bazar", "en"))).toContain("Cox's Bazar Sea Beach");
  });

  it("finds districts by either name and ranks the exact name first", async () => {
    const en = await searchAll("sylhet", "en");
    expect(en.districts[0]?.slug).toBe("sylhet");
    const bn = await searchAll("সিলেট", "bn");
    expect(bn.districts.map((d) => d.slug)).toContain("sylhet");
  });

  it("ranks name matches before places that only share the district", async () => {
    const r = await searchAll("cox", "en");
    const named = r.places.filter((p) => p.nameEn.toLowerCase().includes("cox"));
    expect(named.length).toBeGreaterThanOrEqual(1);
    expect(r.places.length).toBeGreaterThan(named.length); // the rest match through their district
    expect(r.places.slice(0, named.length)).toEqual(named);
  });

  it("returns empty, well-formed results for no query or no match", async () => {
    for (const q of [undefined, null, "", "   ", "qqqqzzzz"]) {
      const r = await searchAll(q, "en");
      expect(r.districts).toEqual([]);
      expect(r.places).toEqual([]);
      expect(r.photos).toEqual([]);
      expect(r.posts).toEqual([]);
      expect(r.totalPlaces).toBe(0);
    }
  });

  it("cuts lists to the limit but reports the full count", async () => {
    const r = await searchAll("a", "en", { places: 5 });
    expect(r.places.length).toBeLessThanOrEqual(5);
    expect(r.totalPlaces).toBeGreaterThanOrEqual(r.places.length);
  });
});

describe("explore text filter", () => {
  it("matches Bengali, English and transliterated names", async () => {
    for (const q of ["সাজেক", "sajek", "Sajek Valley"]) {
      const page = await listPlaces({ q, lang: "en" });
      expect(page.items.map((p) => p.nameEn)).toContain("Sajek Valley");
    }
  });

  it("still matches by slug and district name", async () => {
    const bySlug = await listPlaces({ q: "sajek-valley", lang: "en" });
    expect(bySlug.items.length).toBeGreaterThan(0);
    const byDistrict = await listPlaces({ q: "rangamati", lang: "en" });
    expect(byDistrict.items.length).toBeGreaterThan(0);
  });

  it("exposes the matching ids", () => {
    expect(matchPlaceIds("sajek").length).toBeGreaterThan(0);
    expect(matchPlaceIds("")).toEqual([]);
  });
});
