// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inSeason } from "@/lib/season";
import { seedDataDir } from "../paths";
import { migrateDatabase, openDatabase, type Db } from "./client";
import { CONTENT_TABLES } from "./schema";
import { seedDatabase } from "./seed";

const countRows = (db: Db, table: string) =>
  (db.$client.prepare(`SELECT count(*) AS n FROM "${table}"`).get() as { n: number }).n;

const readData = <T>(file: string): T =>
  JSON.parse(readFileSync(join(seedDataDir(), file), "utf8")) as T;

describe("db:reset (migrate + seed)", () => {
  let db: Db;

  beforeAll(() => {
    db = openDatabase(":memory:");
    migrateDatabase(db);
    seedDatabase(db);
  });

  afterAll(() => db.$client.close());

  it("loads the expected number of rows", () => {
    expect(countRows(db, "divisions")).toBe(8);
    expect(countRows(db, "districts")).toBe(64);
    expect(countRows(db, "places")).toBe(257);
    expect(countRows(db, "kinds")).toBe(11);
    expect(countRows(db, "months")).toBe(12);
    expect(countRows(db, "routes")).toBe(150);
    expect(countRows(db, "routes_from_dhaka")).toBe(63);
    expect(countRows(db, "trains")).toBe(120);
  });

  it("keeps child rows and curation lists complete", () => {
    const trains = readData<{ stops: unknown[]; fares: unknown[] }[]>("trains.json");
    expect(countRows(db, "train_stops")).toBe(trains.reduce((n, t) => n + t.stops.length, 0));
    expect(countRows(db, "train_fares")).toBe(trains.reduce((n, t) => n + t.fares.length, 0));

    const lists = db.$client
      .prepare("SELECT list, count(*) AS n FROM curation GROUP BY list ORDER BY list")
      .all();
    expect(lists).toEqual([
      { list: "popular", n: 24 },
      { list: "trending", n: 56 },
      { list: "unseen", n: 127 },
    ]);
    expect(countRows(db, "directory")).toBe(23);
  });

  it("splits places into 130 popular and 127 unseen and gives every place a cover", () => {
    const q = (sql: string) => (db.$client.prepare(sql).get() as { n: number }).n;
    expect(q("SELECT count(*) AS n FROM places WHERE popular = 1")).toBe(130);
    expect(q("SELECT count(*) AS n FROM places WHERE unseen = 1")).toBe(127);
    expect(q("SELECT count(*) AS n FROM places WHERE cover IS NULL")).toBe(0);
    const cover = db.$client
      .prepare("SELECT cover FROM places WHERE slug = 'nilgiri-hill'")
      .get() as { cover: string };
    expect(JSON.parse(cover.cover)).toMatchObject({
      w640: "/places/w640/nilgiri-hill.webp",
      w1200: "/places/w1200/nilgiri-hill.webp",
    });
  });

  it("matches months.json when months are derived with the wrap-around season rule", () => {
    const places =
      readData<{ slug: string; best_from_month: number; best_to_month: number }[]>("places.json");
    const months = readData<{ month: number; places: string[] }[]>("months.json");
    for (const m of months) {
      const derived = places
        .filter((p) => inSeason(p.best_from_month, p.best_to_month, m.month))
        .map((p) => p.slug)
        .sort();
      expect(derived, `month ${m.month}`).toEqual([...m.places].sort());
    }
  });

  it("is idempotent and leaves user tables alone", () => {
    db.$client.prepare("INSERT INTO users (id, name, handle) VALUES (1, 'Test', 'test')").run();
    db.$client.prepare("INSERT INTO visited (user_id, district_id) VALUES (1, 14)").run();
    db.$client.prepare("INSERT INTO wishlist (user_id, place_id) VALUES (1, 1)").run();

    const before = Object.fromEntries(CONTENT_TABLES.map((t) => [t, countRows(db, t)]));
    seedDatabase(db);
    const after = Object.fromEntries(CONTENT_TABLES.map((t) => [t, countRows(db, t)]));

    expect(after).toEqual(before);
    expect(countRows(db, "users")).toBe(1);
    expect(countRows(db, "visited")).toBe(1);
    expect(countRows(db, "wishlist")).toBe(1);
    expect(db.$client.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("starts every user-generated table empty", () => {
    const fresh = openDatabase(":memory:");
    migrateDatabase(fresh);
    seedDatabase(fresh);
    const userTables = [
      "users",
      "sessions",
      "visited",
      "wishlist",
      "view_history",
      "trips",
      "photos",
      "photo_comments",
      "posts",
      "post_comments",
      "likes",
      "reports",
      "suggestions",
      "guide_suggestions",
      "trend_votes",
      "trend_comments",
      "listings",
      "listing_prices",
      "listing_photos",
      "listing_reviews",
      "leaderboard_entries",
      "short_links",
      "daily_stats",
      "place_stars",
      "admin_log",
    ];
    for (const t of userTables) expect(countRows(fresh, t), t).toBe(0);
    fresh.$client.close();
  });
});
