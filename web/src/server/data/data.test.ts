// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  getDistrict,
  getPlace,
  getRoute,
  getTrain,
  listDistrictsByDivision,
  listKinds,
  listMonths,
  listPlacePoints,
  listPlaces,
  listPopular,
  listRoutesFromDhaka,
  listTrains,
  listTrending,
  listUnseenByDivision,
  nearby,
  placesByKind,
  placesInMonth,
  toLang,
} from "./index";
import { pick } from "./lang";

describe("language resolution", () => {
  it("maps locales to content languages", () => {
    expect(toLang("bn")).toBe("bn");
    expect(toLang("en")).toBe("en");
    expect(toLang("ja")).toBe("en");
    expect(toLang("xx")).toBe("bn");
    expect(toLang(undefined, "en")).toBe("en");
  });

  it("falls back to English, then Bengali", () => {
    expect(pick("bn", "বাংলা", "English")).toBe("বাংলা");
    expect(pick("bn", null, "English")).toBe("English");
    expect(pick("bn", "", "English")).toBe("English");
    expect(pick("en", "বাংলা", "English")).toBe("English");
    expect(pick("en", "বাংলা", null)).toBe("বাংলা");
    expect(pick("en", [], ["tip"])).toEqual(["tip"]);
    expect(pick("en", null, null)).toBeNull();
  });
});

describe("places", () => {
  it("lists every place, paginated, best first", async () => {
    const page = await listPlaces({ pageSize: 24 });
    expect(page.total).toBe(257);
    expect(page.pageCount).toBe(11);
    expect(page.items).toHaveLength(24);
    const stars = page.items.map((p) => p.stars);
    expect(stars).toEqual([...stars].sort((a, b) => b - a));

    const last = await listPlaces({ pageSize: 24, page: 99 });
    expect(last.page).toBe(11);
    expect(last.items).toHaveLength(257 - 240);
  });

  it("filters by district, kind, month and unseen", async () => {
    const bandarban = await listPlaces({ district: "bandarban", pageSize: 100 });
    expect(bandarban.total).toBeGreaterThan(0);
    expect(bandarban.items.every((p) => p.district.slug === "bandarban")).toBe(true);
    expect((await listPlaces({ district: 14 })).total).toBe(bandarban.total);

    const beaches = await listPlaces({ kind: "beach" });
    expect(beaches.total).toBe(9);

    const unseen = await listPlaces({ unseen: true });
    expect(unseen.total).toBe(127);

    const april = await listPlaces({ month: 4 });
    expect(april.total).toBe(26);
    const january = await listPlaces({ month: 1 });
    expect(january.total).toBe(223);

    const combo = await listPlaces({ kind: "hill", month: 12, unseen: true, pageSize: 100 });
    expect(combo.items.every((p) => p.kind.key === "hill" && p.unseen)).toBe(true);
  });

  it("searches names in both languages and slugs", async () => {
    const en = await listPlaces({ q: "Nilgiri" });
    expect(en.items.map((p) => p.slug)).toContain("nilgiri-hill");
    const bn = await listPlaces({ q: "নীলগিরি" });
    expect(bn.items.map((p) => p.slug)).toContain("nilgiri-hill");
    const district = await listPlaces({ q: "cox's bazar", pageSize: 100 });
    expect(district.items.some((p) => p.district.slug === "coxs-bazar")).toBe(true);
    const literal = await listPlaces({ q: "100%_" });
    expect(literal.total).toBe(0);
  });

  it("resolves names and labels by language", async () => {
    const [bn] = (await listPlaces({ q: "nilgiri-hill", lang: "bn" })).items;
    const [en] = (await listPlaces({ q: "nilgiri-hill", lang: "en" })).items;
    expect(bn?.name).toBe("নীলগিরি");
    expect(bn?.district.name).toBe("বান্দরবান");
    expect(bn?.kind.label).toBe("পাহাড়");
    expect(en?.name).toBe("Nilgiri");
    expect(en?.kind.label).toBe("Hills");
  });

  it("returns a place guide with nearby places and the Dhaka route", async () => {
    const place = await getPlace("nilgiri-hill", "en");
    expect(place).not.toBeNull();
    expect(place?.district.slug).toBe("bandarban");
    expect(place?.bestFromMonth).toBe(7);
    expect(place?.bestToMonth).toBe(2);
    expect(place?.nearby.length).toBeGreaterThan(0);
    expect(place?.fromDhaka?.routeSlug).toBe("dhaka-to-bandarban");
    expect(place?.imageCredit?.license).toBe("CC BY-SA 4.0");
    expect(place?.description).toMatch(/Nilgiri/);
    expect(place?.howToGetThere).toMatch(/Bandarban/);
    expect(place?.tips.length).toBeGreaterThanOrEqual(2);
    expect(await getPlace("no-such-place")).toBeNull();
  });

  it("lists places in season, wrapping across the year", async () => {
    const jan = await placesInMonth(1);
    expect(jan).toHaveLength(223);
    expect(jan.map((p) => p.slug)).toContain("nilgiri-hill"); // 7 → 2
    const may = await placesInMonth(5);
    expect(may.map((p) => p.slug)).not.toContain("nilgiri-hill");
    expect(await placesByKind("waterfall")).toHaveLength(9);
  });

  it("finds the nearest places to a point", async () => {
    const near = await nearby(21.91189, 92.32546, 5);
    expect(near).toHaveLength(5);
    expect(near[0]?.slug).toBe("nilgiri-hill");
    expect(near[0]?.distanceKm).toBeCloseTo(0, 5);
    const d = near.map((p) => p.distanceKm);
    expect(d).toEqual([...d].sort((a, b) => a - b));

    const beaches = await nearby(23.81, 90.41, 3, "beach");
    expect(beaches.every((p) => p.kind.key === "beach")).toBe(true);
  });

  it("gives map points only for places with coordinates", async () => {
    expect(await listPlacePoints()).toHaveLength(253);
  });
});

describe("districts and catalogue", () => {
  it("groups the 64 districts under the 8 divisions", async () => {
    const divisions = await listDistrictsByDivision("en");
    expect(divisions).toHaveLength(8);
    expect(divisions[0]?.slug).toBe("dhaka");
    expect(divisions.reduce((n, d) => n + d.districts.length, 0)).toBe(64);
    expect(
      divisions.reduce((n, d) => n + d.districts.reduce((m, x) => m + x.placeCount, 0), 0),
    ).toBe(257);
  });

  it("returns a district guide", async () => {
    const sylhet = await getDistrict("sylhet", "bn");
    expect(sylhet?.name).toBe("সিলেট");
    expect(sylhet?.divisionRef.slug).toBe("sylhet");
    expect(sylhet?.places.length).toBe(sylhet?.placeCount);
    expect(sylhet?.famousFor.length).toBeGreaterThan(0);
    expect(sylhet?.intro).toMatch(/[\u0980-\u09FF]/);
    expect(sylhet?.howToReach).toBeTruthy();
    expect(sylhet?.fromDhaka?.routeSlug).toBe("dhaka-to-sylhet");
    expect(sylhet?.nearbyDistricts).toHaveLength(6);
    expect((await getDistrict("dhaka"))?.fromDhaka).toBeNull();
    expect(await getDistrict("atlantis")).toBeNull();
  });

  it("lists kinds and months with counts", async () => {
    const kinds = await listKinds("en");
    expect(kinds).toHaveLength(11);
    expect(kinds.reduce((n, k) => n + k.count, 0)).toBe(257);
    const months = await listMonths("bn");
    expect(months.map((m) => m.count)).toEqual([
      223, 222, 118, 26, 26, 39, 57, 59, 61, 120, 228, 226,
    ]);
    expect(months[10]?.name).toBe("নভেম্বর");
  });

  it("serves the curated lists", async () => {
    expect(await listPopular()).toHaveLength(24);
    const unseen = await listUnseenByDivision();
    expect(unseen.reduce((n, d) => n + d.count, 0)).toBe(127);
    const trending = await listTrending("en");
    expect(trending.items).toHaveLength(56);
    expect(trending.items[0]?.place.slug).toBe("nilgiri-hill");
  });
});

describe("routes and trains", () => {
  it("returns a route with bus details in the requested language", async () => {
    const bn = await getRoute("dhaka-to-bandarban", "bn");
    const en = await getRoute("dhaka-to-bandarban", "en");
    expect(bn?.from.slug).toBe("dhaka");
    expect(bn?.to.slug).toBe("bandarban");
    expect(bn?.bus?.nonAc).toEqual({ min: 980, max: 1050, asOf: "2026-10-08" });
    expect(en?.bus?.terminals[0]).toBe("Sayedabad Bus Terminal");
    expect(bn?.bus?.terminals[0]).toBe("সায়েদাবাদ বাস টার্মিনাল");
    expect(en?.bus?.operators[0]).toEqual({ name: "Hanif Enterprise", ac: "both" });
    expect(en?.reverseSlug).toBe("bandarban-to-dhaka");
    expect(await getRoute("nowhere-to-dhaka")).toBeNull();
  });

  it("lists the 63 Dhaka summaries with route links", async () => {
    const rows = await listRoutesFromDhaka("en");
    expect(rows).toHaveLength(63);
    expect(rows.every((r) => r.district.slug !== "dhaka")).toBe(true);
    expect(rows.filter((r) => r.routeSlug).length).toBe(63);
  });

  it("lists 120 trains and resolves a timetable", async () => {
    const trains = await listTrains("en");
    expect(trains).toHaveLength(120);
    const nos = trains.map((t) => t.no);
    expect(nos).toEqual([...nos].sort((a, b) => a - b));

    const train = await getTrain("suborno-express-701", "en");
    expect(train?.name).toBe("Suborno Express");
    expect(train?.from.station).toBe("Chattogram");
    expect(train?.stops[0]?.station).toBe("Chattogram");
    expect(train?.fares[0]?.from).toBe("Chattogram");
    expect(train?.returnTrain?.slug).toBe("suborno-express-702");
    expect((await getTrain("suborno-express-701", "bn"))?.fares[0]?.from).toBe("চট্টগ্রাম");
    expect(await getTrain("ghost-train")).toBeNull();
  });
});

describe("community content", () => {
  it("is empty until visitors submit something that a moderator approves", async () => {
    const { listApprovedSuggestions, listLatestPhotos, listLatestPosts } = await import("./index");
    expect(await listLatestPhotos("en")).toEqual([]);
    expect(await listLatestPosts()).toEqual([]);
    expect(await listApprovedSuggestions("en")).toEqual([]);
  });
});
