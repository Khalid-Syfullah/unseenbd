// @vitest-environment node
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DAILY } from "@/lib/community/rules";
import { tiersFrom } from "@/lib/listings/rules";
import { visitPath } from "@/lib/visits";
import { logAdmin, recentAdminLog } from "@/server/admin/log";
import { recordVisit, statsReport } from "@/server/admin/stats";
import { resetAuthLimits } from "@/server/auth/limits";
import { accountLimiter } from "@/server/auth/http";
import { resetCommunityLimits } from "@/server/community/http";
import { getListing, listListings, listMyListings, listPageListings } from "@/server/data/listings";
import { getDb } from "@/server/db/client";
import { seedDatabase } from "@/server/db/seed";
import { dailyStats, listingPhotos, listings, places, users } from "@/server/db/schema";
import { freshEmail, TestBrowser } from "./account-helpers";
import { TINY_JPEG } from "./media-fixtures";

let mediaRoot: string;
beforeAll(() => {
  mediaRoot = mkdtempSync(join(tmpdir(), "ubd-listing-media-"));
  process.env.MEDIA_DIR = mediaRoot;
});
afterAll(() => {
  rmSync(mediaRoot, { recursive: true, force: true });
  delete process.env.MEDIA_DIR;
});
beforeEach(() => {
  resetAuthLimits();
  accountLimiter.reset();
  resetCommunityLimits();
});

const file = (name: string) => new File([TINY_JPEG as BlobPart], name, { type: "image/jpeg" });

function listingForm(overrides: Record<string, string> = {}, photoCount = 3): FormData {
  const form = new FormData();
  const fields: Record<string, string> = {
    kind: "business",
    category: "hotel",
    sizeTier: "small",
    name: "Hill View Guesthouse",
    district: "bandarban",
    area: "Nilgiri road",
    description: "Six clean rooms with a view of the clouds.",
    contactName: "Rahim Uddin",
    phone: "01712345678",
    whatsapp: "+8801712345678",
    socialUrl: "https://facebook.com/hillview",
    prices: JSON.stringify([
      { item: "Double room", amount: 2500, unit: "per night" },
      { item: "Breakfast", amount: 300, unit: "" },
    ]),
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  for (let i = 0; i < photoCount; i++) {
    form.append("photo", file(`p${i}.jpg`));
    form.append("thumb", file(`t${i}.jpg`));
  }
  return form;
}

async function guest() {
  const b = new TestBrowser();
  await b.getCsrf();
  return b;
}

async function member() {
  const b = new TestBrowser();
  expect((await b.register(freshEmail())).status).toBe(201);
  return b;
}

async function admin() {
  const b = await member();
  const row = getDb().select().from(users).orderBy(users.id).all().at(-1)!;
  getDb().update(users).set({ role: "admin" }).where(eq(users.id, row.id)).run();
  return b;
}

const submit = async (b: TestBrowser, overrides: Record<string, string> = {}, photos = 3) => {
  const res = await b.call("POST", "/api/listings", { form: listingForm(overrides, photos) });
  return { res, body: (await res.json()) as Record<string, unknown> };
};

describe("size tiers", () => {
  it("come from the seeded listing_submission_tiers", () => {
    const row = getDb()
      .$client.prepare("SELECT value FROM reference WHERE key = 'listing_submission_tiers'")
      .get() as { value: string };
    expect(tiersFrom(JSON.parse(row.value))).toEqual([
      { size: "small", maxPrices: 5, minPhotos: 3, maxPhotos: 5 },
      { size: "medium", maxPrices: 12, minPhotos: 3, maxPhotos: 8 },
      { size: "large", maxPrices: 25, minPhotos: 3, maxPhotos: 10 },
    ]);
  });
});

describe("owner listings", () => {
  it("go pending → approved → visible, and reviews wait for a moderator", async () => {
    const owner = await member();
    const { res, body } = await submit(owner);
    expect(res.status).toBe(201);
    expect(body.status).toBe("pending");
    const id = body.id as number;

    // Pending: not public, but the owner sees it in "My listings".
    expect((await listListings()).total).toBe(0);
    expect((await (await guest()).call("GET", `/api/listings/${id}`)).status).toBe(404);
    expect((await owner.call("GET", `/api/listings/${id}`)).status).toBe(200);
    const mine = await listMyListings(
      getDb().select().from(listings).where(eq(listings.id, id)).get()!.userId!,
      "en",
    );
    expect(mine[0]).toMatchObject({ id, status: "pending", name: "Hill View Guesthouse" });
    expect((await (await owner.call("GET", "/api/my/listings")).json()).listings).toHaveLength(1);

    // Contact details are normalised; prices and photos are stored.
    const row = getDb().select().from(listings).where(eq(listings.id, id)).get()!;
    expect(row.whatsapp).toBe("01712345678");
    expect(row.ipHash).toMatch(/^[0-9a-f]{32}$/);
    expect(
      getDb().select().from(listingPhotos).where(eq(listingPhotos.listingId, id)).all(),
    ).toHaveLength(3);

    // An admin approves it through the queue.
    const boss = await admin();
    const queue = await (await boss.call("GET", "/api/admin/listings?status=pending")).json();
    expect(queue.items.map((i: { id: string }) => i.id)).toContain(String(id));
    const approve = await boss.call("POST", "/api/admin/listings", {
      json: { ids: [String(id)], action: "approve" },
    });
    expect(await approve.json()).toEqual({ changed: 1 });

    expect((await listListings({}, { lang: "en" })).items[0]).toMatchObject({
      id,
      priceFrom: 300,
      district: { slug: "bandarban", name: "Bandarban" },
    });
    const detail = await getListing(id, "en");
    expect(detail?.prices.map((p) => p.item)).toEqual(["Double room", "Breakfast"]);
    expect(detail?.photos).toHaveLength(3);
    const stay = await listPageListings("stay", "en");
    expect(stay.businesses.map((l) => l.id)).toEqual([id]);
    expect((await listPageListings("restaurants", "en")).businesses).toEqual([]);

    // Reviews: pending until approved in the listing-reviews queue.
    const visitor = await guest();
    const review = await visitor.call("POST", `/api/listings/${id}/reviews`, {
      json: { name: "Mitu", rating: 5, body: "Lovely stay" },
    });
    expect(review.status).toBe(201);
    expect((await getListing(id, "en"))?.reviewList).toEqual([]);
    const reviews = await (await boss.call("GET", "/api/admin/listing-reviews")).json();
    expect(reviews.items).toHaveLength(1);
    await boss.call("POST", "/api/admin/listing-reviews", {
      json: { ids: [reviews.items[0].id], action: "approve" },
    });
    const after = await getListing(id, "en");
    expect(after).toMatchObject({ rating: 5, reviews: 1 });
    expect(
      (
        await visitor.call("POST", `/api/listings/${id}/reviews`, {
          json: { name: "X", rating: 9 },
        })
      ).status,
    ).toBe(400);
  });

  it("labels sponsored listings and puts them first", async () => {
    const owner = await guest();
    const a = (await submit(owner, { name: "Plain Place" })).body.id as number;
    const b = (await submit(owner, { name: "Paid Place" })).body.id as number;
    const boss = await admin();
    await boss.call("POST", "/api/admin/listings", {
      json: { ids: [String(a), String(b)], action: "approve" },
    });
    await boss.call("POST", "/api/admin/listings", {
      json: { ids: [String(a)], action: "sponsor" },
    });
    const items = (await listListings({}, { lang: "en" })).items;
    expect(items.filter((i) => [a, b].includes(i.id)).map((i) => [i.id, i.sponsored])).toEqual([
      [a, true],
      [b, false],
    ]);
  });

  it("checks the form: tier limits, phone, honeypot and the daily quota", async () => {
    const owner = await guest();
    const prices = (n: number) =>
      JSON.stringify(
        Array.from({ length: n }, (_, i) => ({ item: `Item ${i}`, amount: 100, unit: "" })),
      );
    const tooMany = await submit(owner, { prices: prices(6) });
    expect(tooMany.res.status).toBe(400);
    expect(tooMany.body).toMatchObject({ field: "prices", reason: "too_many" });
    expect((await submit(owner, { sizeTier: "medium", prices: prices(6) })).res.status).toBe(201);

    expect((await submit(owner, { phone: "12345" })).body).toMatchObject({ field: "phone" });
    expect((await submit(owner, { socialUrl: "javascript:alert(1)" })).body).toMatchObject({
      field: "socialUrl",
    });
    expect((await submit(owner, { description: "x".repeat(601) })).body).toMatchObject({
      field: "description",
    });
    expect((await submit(owner, {}, 2)).body).toMatchObject({ field: "photos", reason: "too_few" });
    expect((await submit(owner, {}, 6)).body).toMatchObject({
      field: "photos",
      reason: "too_many",
    });
    expect((await submit(owner, { category: "spaceship" })).body).toMatchObject({
      field: "category",
    });

    // A filled honeypot looks like success and stores nothing.
    const before = getDb().select().from(listings).all().length;
    const bot = await submit(owner, { company_url: "http://spam.example" });
    expect(bot.res.status).toBe(201);
    expect(getDb().select().from(listings).all().length).toBe(before);

    // Daily quota (one was used above; the failed ones refunded nothing because they never counted).
    const left = DAILY.listings - 1;
    for (let i = 0; i < left; i++) expect((await submit(owner)).res.status).toBe(201);
    const over = await submit(owner);
    expect(over.res.status).toBe(429);
    expect(over.body).toMatchObject({ error: "quota" });
    expect(await (await owner.call("GET", "/api/listings/quota")).json()).toMatchObject({
      remaining: 0,
    });
  });

  it("lets owners edit (back to pending) and delete only their own", async () => {
    const owner = await member();
    const other = await member();
    const id = (await submit(owner)).body.id as number;
    const photos = getDb()
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, id))
      .all();
    const files = photos.map((p) => join(mediaRoot, p.src.replace(/^\/media\//, "")));
    expect(files.every(existsSync)).toBe(true);

    getDb().update(listings).set({ status: "approved" }).where(eq(listings.id, id)).run();
    const edit = listingForm({ name: "Hill View Lodge" }, 1);
    edit.set("keep", JSON.stringify(photos.slice(0, 2).map((p) => p.src)));
    expect((await other.call("PATCH", `/api/my/listings/${id}`, { form: edit })).status).toBe(404);
    const ok = await owner.call("PATCH", `/api/my/listings/${id}`, { form: edit });
    expect(ok.status).toBe(200);
    const row = getDb().select().from(listings).where(eq(listings.id, id)).get()!;
    expect(row).toMatchObject({ name: "Hill View Lodge", status: "pending" });
    expect(existsSync(files[2]!)).toBe(false); // the removed photo's file is gone
    expect(existsSync(files[0]!)).toBe(true);

    expect((await other.call("DELETE", `/api/my/listings/${id}`)).status).toBe(404);
    expect((await owner.call("DELETE", `/api/my/listings/${id}`)).status).toBe(200);
    expect(getDb().select().from(listings).where(eq(listings.id, id)).get()).toBeUndefined();
    expect(files.some(existsSync)).toBe(false);
  });
});

describe("admin", () => {
  it("is invisible to everyone but admins (404)", async () => {
    const paths = [
      "/api/admin/photos",
      "/api/admin/queues",
      "/api/admin/stats",
      "/api/admin/stars",
      "/api/admin/log",
    ];
    for (const browser of [await guest(), await member()]) {
      for (const path of paths) expect((await browser.call("GET", path)).status).toBe(404);
      const post = await browser.call("POST", "/api/admin/photos", {
        json: { ids: ["1"], action: "approve" },
      });
      expect(post.status).toBe(404);
    }
    const boss = await admin();
    for (const path of paths) expect((await boss.call("GET", path)).status).toBe(200);
    expect((await boss.call("GET", "/api/admin/nope")).status).toBe(404);
    // Mutations need the CSRF token like any signed-in endpoint.
    const noCsrf = await boss.call("POST", "/api/admin/photos", {
      json: { ids: ["1"], action: "approve" },
      csrf: false,
    });
    expect(noCsrf.status).toBe(403);
  });

  it("moderates photos in bulk and logs every action", async () => {
    const boss = await admin();
    const photoIds = (await Promise.all(
      [1, 2, 3].map(async () => {
        const b = await guest();
        const form = new FormData();
        for (const [k, v] of Object.entries({ name: "Rupa", district: "bandarban", consent: "1" }))
          form.set(k, v);
        form.append("photo", file("a.jpg"));
        form.append("thumb", file("t.jpg"));
        const res = await b.call("POST", "/api/photos", { form });
        return ((await res.json()) as { ids: number[] }).ids[0]!;
      }),
    )) as number[];
    const queue = await (await boss.call("GET", "/api/admin/photos")).json();
    expect(queue.total).toBeGreaterThanOrEqual(3);

    const before = recentAdminLog().length;
    const approve = await boss.call("POST", "/api/admin/photos", {
      json: { ids: photoIds.slice(0, 2).map(String), action: "approve" },
    });
    expect(await approve.json()).toEqual({ changed: 2 });
    const reject = await boss.call("POST", "/api/admin/photos", {
      json: { ids: [String(photoIds[2])], action: "delete" },
    });
    expect(await reject.json()).toEqual({ changed: 1 });
    const log = recentAdminLog();
    expect(log.length).toBe(before + 2);
    expect(log[0]).toMatchObject({
      action: "delete",
      target: "photos",
      ids: [String(photoIds[2])],
    });
    expect(log[1]).toMatchObject({ action: "approve", target: "photos" });
    const approved = await (await boss.call("GET", "/api/admin/photos?status=approved")).json();
    expect(approved.items.map((i: { id: string }) => i.id)).toEqual(
      expect.arrayContaining(photoIds.slice(0, 2).map(String)),
    );
    // Unknown actions and ids are refused.
    expect(
      (await boss.call("POST", "/api/admin/photos", { json: { ids: ["1"], action: "sponsor" } }))
        .status,
    ).toBe(400);
    expect(
      (await boss.call("POST", "/api/admin/photos", { json: { ids: [], action: "approve" } }))
        .status,
    ).toBe(400);
    logAdmin(1, "x", "y", []);
  });

  it("sets editorial stars that survive a re-seed, and can reset them", async () => {
    const boss = await admin();
    const slug = getDb().select().from(places).orderBy(places.id).get()!.slug;
    const original = getDb().select().from(places).where(eq(places.slug, slug)).get()!.stars;
    const set = await boss.call("POST", "/api/admin/stars", { json: { slug, score: 3 } });
    expect(await set.json()).toMatchObject({ slug, score: 3, stars: 300, edited: true });
    expect(getDb().select().from(places).where(eq(places.slug, slug)).get()!.stars).toBe(300);

    seedDatabase(getDb());
    expect(getDb().select().from(places).where(eq(places.slug, slug)).get()!.stars).toBe(300);

    const list = await (
      await boss.call("GET", `/api/admin/stars?q=${encodeURIComponent(slug)}`)
    ).json();
    expect(list.items.find((r: { slug: string }) => r.slug === slug)).toMatchObject({
      score: 3,
      edited: true,
    });

    const reset = await boss.call("POST", "/api/admin/stars", { json: { slug, score: null } });
    expect(await reset.json()).toMatchObject({ stars: original, edited: false });
    expect(getDb().select().from(places).where(eq(places.slug, slug)).get()!.stars).toBe(original);
    expect(
      (await boss.call("POST", "/api/admin/stars", { json: { slug, score: 11 } })).status,
    ).toBe(400);
    expect(
      (await boss.call("POST", "/api/admin/stars", { json: { slug: "nope", score: 1 } })).status,
    ).toBe(404);
  });
});

describe("daily visit counts", () => {
  it("normalises page paths and drops everything else", () => {
    expect(visitPath("/")).toMatchObject({ pattern: "/" });
    expect(visitPath("/en")).toMatchObject({ pattern: "/" });
    expect(visitPath("/en/explore?x=1")).toMatchObject({ pattern: "/explore" });
    expect(visitPath("/place/nilgiri-hill")).toEqual({
      pattern: "/place/[slug]",
      section: "place",
      slug: "nilgiri-hill",
    });
    expect(visitPath("/zh/district/sylhet")).toMatchObject({ pattern: "/district/[slug]" });
    for (const bad of [
      "/api/me",
      "/admin",
      "/en/admin",
      "/wp-login.php",
      "/place",
      "/a/b/c",
      "x",
      5,
      null,
      "/place/" + "a".repeat(90),
    ]) {
      expect(visitPath(bad)).toBeNull();
    }
  });

  it("adds to a counter per page per day, with no visitor data", async () => {
    const day = new Date("2026-03-04T10:00:00Z");
    expect(recordVisit("/en/place/nilgiri-hill", day)).toBe(true);
    expect(recordVisit("/place/nilgiri-hill", day)).toBe(true);
    expect(recordVisit("/place/no-such-place-here", day)).toBe(true);
    expect(recordVisit("/admin", day)).toBe(false);
    const rows = getDb().select().from(dailyStats).where(eq(dailyStats.day, "2026-03-04")).all();
    const by = Object.fromEntries(rows.map((r) => [r.metric, r.value]));
    expect(by).toMatchObject({ visits: 3, "v:/place/[slug]": 3, "v:/place/nilgiri-hill": 2 });
    expect(by["v:/place/no-such-place-here"]).toBeUndefined();
    // The table holds only (day, metric, value): nothing that could identify a visitor.
    const columns = getDb().$client.prepare("PRAGMA table_info(daily_stats)").all() as {
      name: string;
    }[];
    expect(columns.map((c) => c.name).sort()).toEqual(["day", "metric", "value"]);

    const report = statsReport("2026-03-03", "2026-03-05");
    expect(report.days.map((d) => d.visits)).toEqual([0, 3, 0]);
    expect(report.totals.visits).toBe(3);
    expect(report.pages[0]).toMatchObject({ path: "/place/[slug]", visits: 3 });
  });

  it("counts through POST /api/visit without cookies and reports uploads and sign-ups", async () => {
    const b = await guest();
    const res = await b.call("POST", "/api/visit", { json: { path: "/en/explore" }, csrf: false });
    expect(res.status).toBe(204);
    expect(res.headers.getSetCookie()).toEqual([]);
    const junk = await b.call("POST", "/api/visit", { json: { path: "/api/me" }, csrf: false });
    expect(junk.status).toBe(204);

    const boss = await admin();
    const stats = await (await boss.call("GET", "/api/admin/stats")).json();
    expect(stats.days).toHaveLength(30);
    expect(stats.totals.visits).toBeGreaterThanOrEqual(1);
    expect(stats.totals.signups).toBeGreaterThanOrEqual(1);
    expect(stats.pages.map((p: { path: string }) => p.path)).toContain("/explore");
    expect((await boss.call("GET", "/api/admin/stats?from=2026-02-30&to=2026-03-01")).status).toBe(
      400,
    );
    expect((await boss.call("GET", "/api/admin/stats?from=2024-01-01&to=2026-01-01")).status).toBe(
      400,
    );
  });
});
