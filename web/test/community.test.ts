// @vitest-environment node
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getMedia } from "@/app/media/[...path]/route";
import { DAILY, PHOTO_BYTES_MAX } from "@/lib/community/rules";
import { seasonOf } from "@/lib/community/season";
import { checkText, plainText } from "@/lib/community/text";
import { hasMetadata, sniffImage } from "@/lib/media/image-bytes";
import { resetAuthLimits } from "@/server/auth/limits";
import { accountLimiter } from "@/server/auth/http";
import { resetCommunityLimits } from "@/server/community/http";
import { listTrending } from "@/server/data/catalog";
import { listGallery, listLatestPosts } from "@/server/data/community";
import { getDb } from "@/server/db/client";
import {
  guideSuggestions,
  photoComments,
  photos,
  postComments,
  posts,
  reports,
  suggestions,
  trendComments,
} from "@/server/db/schema";
import { freshEmail, TestBrowser } from "./account-helpers";
import { contains, GPS_MARKER, jpegSized, jpegWithGps, TINY_JPEG } from "./media-fixtures";

let mediaRoot: string;

beforeAll(() => {
  mediaRoot = mkdtempSync(join(tmpdir(), "ubd-media-"));
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

const file = (bytes: Uint8Array, name = "photo.jpg", type = "image/jpeg") =>
  new File([bytes as BlobPart], name, { type });

function uploadForm(
  overrides: Record<string, string> = {},
  images: Uint8Array[] = [TINY_JPEG],
): FormData {
  const form = new FormData();
  const fields = {
    name: "Rahim Uddin",
    email: "rahim@example.com",
    district: "bandarban",
    place: "nilgiri-hill",
    caption: "Morning clouds",
    consent: "1",
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  for (const bytes of images) {
    form.append("photo", file(bytes));
    form.append("thumb", file(TINY_JPEG, "thumb.jpg"));
  }
  return form;
}

async function guest() {
  const browser = new TestBrowser();
  await browser.getCsrf();
  return browser;
}

async function member(name = "Mitu Akter") {
  const browser = new TestBrowser();
  const res = await browser.register(freshEmail(), "correct horse battery", name);
  expect(res.status).toBe(201);
  return browser;
}

const db = () => getDb();
const fileOf = (src: string) => join(mediaRoot, src.replace(/^\/media\//, ""));

function approvePhoto(id: number) {
  db().update(photos).set({ status: "approved" }).where(eq(photos.id, id)).run();
}

async function uploadApproved(browser?: TestBrowser): Promise<number> {
  const b = browser ?? (await guest());
  const res = await b.call("POST", "/api/photos", { form: uploadForm() });
  expect(res.status).toBe(201);
  const { ids } = (await res.json()) as { ids: number[] };
  approvePhoto(ids[0]!);
  return ids[0]!;
}

describe("photo uploads", () => {
  it("stores an uploaded JPEG with GPS EXIF without any EXIF, pending moderation", async () => {
    const original = jpegWithGps();
    expect(hasMetadata(original)).toBe(true);
    expect(contains(original, "Exif")).toBe(true);
    expect(contains(original, GPS_MARKER)).toBe(true);

    const browser = await guest();
    const res = await browser.call("POST", "/api/photos", { form: uploadForm({}, [original]) });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ids: number[]; status: string; remaining: number };
    expect(body.status).toBe("pending");
    expect(body.remaining).toBe(DAILY.photos - 1);

    const row = db().select().from(photos).where(eq(photos.id, body.ids[0]!)).get()!;
    expect(row.status).toBe("pending");
    expect(row.uploaderEmail).toBe("rahim@example.com");
    expect(row.ipHash).toMatch(/^[0-9a-f]{32}$/);
    expect(row.ipHash).not.toContain(browser.ip);
    expect(row.width).toBe(32);
    expect(row.height).toBe(24);

    const stored = new Uint8Array(readFileSync(fileOf(row.src)));
    expect(contains(stored, "Exif")).toBe(false);
    expect(contains(stored, GPS_MARKER)).toBe(false);
    expect(hasMetadata(stored)).toBe(false);
    expect(sniffImage(stored)).toMatchObject({ type: "image/jpeg", width: 32, height: 24 });
    expect(existsSync(fileOf(row.thumb!))).toBe(true);

    // Not public until a moderator approves it.
    expect((await listGallery()).items.map((p) => p.id)).not.toContain(row.id);
    expect((await browser.call("GET", `/api/photos/${row.id}`)).status).toBe(404);
    approvePhoto(row.id);
    const gallery = await listGallery({ district: "bandarban", lang: "en" });
    expect(gallery.items[0]).toMatchObject({
      id: row.id,
      uploader: "Rahim Uddin",
      place: { slug: "nilgiri-hill" },
    });
    expect(JSON.stringify(gallery)).not.toContain("rahim@example.com");
  });

  it("serves stored files from /media with a long cache, and nothing else", async () => {
    const id = await uploadApproved();
    const row = db().select().from(photos).where(eq(photos.id, id)).get()!;
    const segments = row.src.replace(/^\/media\//, "").split("/");
    const res = await getMedia(new NextRequest(`http://localhost${row.src}`), {
      params: Promise.resolve({ path: segments }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("immutable");
    for (const bad of [
      ["..", "..", "package.json"],
      ["2026", "x.txt"],
      ["%2e%2e", "a.jpg"],
    ]) {
      const r = await getMedia(new NextRequest("http://localhost/media/x"), {
        params: Promise.resolve({ path: bad }),
      });
      expect(r.status).toBe(404);
    }
  });

  it("allows two batches a day per IP and says how many are left", async () => {
    const browser = await guest();
    const quota = async () =>
      ((await (await browser.call("GET", "/api/photos/quota")).json()) as { remaining: number })
        .remaining;
    expect(await quota()).toBe(2);
    expect((await browser.call("POST", "/api/photos", { form: uploadForm() })).status).toBe(201);
    expect(await quota()).toBe(1);
    expect((await browser.call("POST", "/api/photos", { form: uploadForm() })).status).toBe(201);
    expect(await quota()).toBe(0);
    const third = await browser.call("POST", "/api/photos", { form: uploadForm() });
    expect(third.status).toBe(429);
    expect(await third.json()).toMatchObject({ error: "quota", remaining: 0 });
    // Another address still has its own two.
    const other = await guest();
    expect((await other.call("POST", "/api/photos", { form: uploadForm() })).status).toBe(201);
  });

  it("validates every field and file on the server", async () => {
    const browser = await guest();
    const post = (form: FormData) => browser.call("POST", "/api/photos", { form });
    const png = new Uint8Array(readFileSync(join(__dirname, "../../assets/brand/favicon-48.png")));
    expect((await post(uploadForm({}, [png]))).status).toBe(415);
    expect((await post(uploadForm({}, [new Uint8Array(PHOTO_BYTES_MAX + 1)]))).status).toBe(413);
    expect((await post(uploadForm({}, [jpegSized(2400, 1600)]))).status).toBe(400);
    expect((await post(uploadForm({}, [TINY_JPEG, TINY_JPEG, TINY_JPEG, TINY_JPEG]))).status).toBe(
      400,
    );
    expect((await post(uploadForm({}, []))).status).toBe(400);
    expect((await post(uploadForm({ name: "  " }))).status).toBe(400);
    expect((await post(uploadForm({ email: "not an email" }))).status).toBe(400);
    expect((await post(uploadForm({ consent: "" }))).status).toBe(400);
    expect((await post(uploadForm({ district: "atlantis" }))).status).toBe(400);
    // A place must be in the chosen district.
    expect((await post(uploadForm({ district: "dhaka" }))).status).toBe(400);
    const noThumb = uploadForm();
    noThumb.delete("thumb");
    expect((await post(noThumb)).status).toBe(400);
    // Without the CSRF token nothing is accepted.
    const res = await browser.call("POST", "/api/photos", { form: uploadForm(), csrf: false });
    expect(res.status).toBe(403);
    // None of the refused uploads used up the quota.
    const quota = (await (await browser.call("GET", "/api/photos/quota")).json()) as {
      remaining: number;
    };
    expect(quota.remaining).toBe(DAILY.photos);
  });

  it("links an upload to the account when signed in and lets the owner delete it", async () => {
    const browser = await member();
    const res = await browser.call("POST", "/api/photos", { form: uploadForm() });
    const { ids } = (await res.json()) as { ids: number[] };
    const row = db().select().from(photos).where(eq(photos.id, ids[0]!)).get()!;
    expect(row.userId).not.toBeNull();
    expect((await browser.call("DELETE", "/api/me/photos")).status).toBe(200);
    expect(db().select().from(photos).where(eq(photos.id, row.id)).get()).toBeUndefined();
    expect(existsSync(fileOf(row.src))).toBe(false);
    expect(existsSync(fileOf(row.thumb!))).toBe(false);
  });
});

describe("photo comments, likes and reports", () => {
  it("keeps comments to 100 characters, strips markup and holds them for moderation", async () => {
    const id = await uploadApproved();
    const browser = await guest();
    const send = (json: unknown) => browser.call("POST", `/api/photos/${id}/comments`, { json });
    expect((await send({ name: "Lima", body: "x".repeat(101) })).status).toBe(400);
    expect((await send({ name: "", body: "Lovely" })).status).toBe(400);
    const res = await send({ name: "<b>Lima</b>", body: "Lovely <script>alert(1)</script>view" });
    expect(res.status).toBe(201);
    const { id: commentId } = (await res.json()) as { id: number };
    const row = db().select().from(photoComments).where(eq(photoComments.id, commentId)).get()!;
    expect(row).toMatchObject({ name: "Lima", body: "Lovely alert(1)view", status: "pending" });

    const list = async () =>
      (
        (await (await browser.call("GET", `/api/photos/${id}/comments`)).json()) as {
          comments: { body: string }[];
        }
      ).comments;
    expect(await list()).toEqual([]);
    db()
      .update(photoComments)
      .set({ status: "visible" })
      .where(eq(photoComments.id, commentId))
      .run();
    expect((await list()).map((c) => c.body)).toEqual(["Lovely alert(1)view"]);
  });

  it("counts one like per device and lets it be taken back", async () => {
    const id = await uploadApproved();
    const browser = await guest();
    const like = async (on: boolean) =>
      (await (
        await browser.call("POST", `/api/photos/${id}/react`, { json: { kind: "like", on } })
      ).json()) as { totals: { likes: number }; mine: { like: boolean } };
    const first = await like(true);
    expect(first).toMatchObject({ totals: { likes: 1 }, mine: { like: true } });
    expect(browser.cookies.get("ubd_device")).toBeTruthy();
    expect((await like(true)).totals.likes).toBe(1);
    const other = await guest();
    await other.call("POST", `/api/photos/${id}/react`, { json: { kind: "like" } });
    expect((await like(false)).totals.likes).toBe(1);
    // Photos take likes only.
    const star = await browser.call("POST", `/api/photos/${id}/react`, {
      json: { kind: "star", value: 5 },
    });
    expect(star.status).toBe(400);
  });

  it("files reports for public photos only", async () => {
    const id = await uploadApproved();
    const browser = await guest();
    const report = (json: unknown) => browser.call("POST", "/api/reports", { json });
    expect((await report({ type: "photo", id, reason: "nonsense" })).status).toBe(400);
    expect((await report({ type: "photo", id: 999_999, reason: "spam" })).status).toBe(404);
    const res = await report({ type: "photo", id, reason: "privacy", note: "My face" });
    expect(res.status).toBe(201);
    // Reporting again updates the open report instead of adding one.
    await report({ type: "photo", id, reason: "copyright" });
    const rows = db().select().from(reports).where(eq(reports.targetId, id)).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: "copyright", status: "open" });
  });
});

describe("posts", () => {
  function postForm(body: string, images: Uint8Array[] = [], extra: Record<string, string> = {}) {
    const form = new FormData();
    form.set("body", body);
    for (const [k, v] of Object.entries(extra)) form.set(k, v);
    for (const bytes of images) {
      form.append("photo", file(bytes));
      form.append("thumb", file(TINY_JPEG, "t.jpg"));
    }
    return form;
  }

  it("needs an account, starts pending and shows in the feed once approved", async () => {
    const visitor = await guest();
    expect(
      (await visitor.call("POST", "/api/posts", { form: postForm("Hello Sajek") })).status,
    ).toBe(401);

    const author = await member("Tania Islam");
    const res = await author.call("POST", "/api/posts", {
      form: postForm("Clouds at Sajek 🌄 <i>wow</i>", [jpegWithGps()], { district: "rangamati" }),
    });
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: number };
    const row = db().select().from(posts).where(eq(posts.id, id)).get()!;
    expect(row.status).toBe("pending");
    expect(row.body).toBe("Clouds at Sajek 🌄 wow");
    expect(row.photos).toHaveLength(1);
    const stored = new Uint8Array(readFileSync(fileOf(row.photos![0]!.src)));
    expect(contains(stored, GPS_MARKER)).toBe(false);

    expect((await listLatestPosts()).map((p) => p.id)).not.toContain(id);
    // The author sees their own pending post; others do not.
    expect((await author.call("GET", `/api/posts/${id}`)).status).toBe(200);
    expect((await visitor.call("GET", `/api/posts/${id}`)).status).toBe(404);
    db().update(posts).set({ status: "approved" }).where(eq(posts.id, id)).run();
    const feed = await listLatestPosts(24, "en");
    expect(feed.find((p) => p.id === id)).toMatchObject({
      author: "Tania Islam",
      district: { slug: "rangamati" },
    });
  });

  it("lets only the author edit (back to pending) or delete a post", async () => {
    const author = await member();
    const res = await author.call("POST", "/api/posts", { form: postForm("First", [TINY_JPEG]) });
    const { id } = (await res.json()) as { id: number };
    db().update(posts).set({ status: "approved" }).where(eq(posts.id, id)).run();
    const photo = db().select().from(posts).where(eq(posts.id, id)).get()!.photos![0]!;

    const stranger = await member("Someone Else");
    const edit = postForm("Hijacked", [], { keep: "[]" });
    expect((await stranger.call("PATCH", `/api/posts/${id}`, { form: edit })).status).toBe(404);
    expect((await stranger.call("DELETE", `/api/posts/${id}`)).status).toBe(404);

    const mine = postForm("Edited text", [], { keep: "[]" });
    expect((await author.call("PATCH", `/api/posts/${id}`, { form: mine })).status).toBe(200);
    const edited = db().select().from(posts).where(eq(posts.id, id)).get()!;
    expect(edited).toMatchObject({ body: "Edited text", status: "pending", photos: [] });
    expect(existsSync(fileOf(photo.src))).toBe(false);

    const tooMany = postForm("x", [TINY_JPEG, TINY_JPEG, TINY_JPEG, TINY_JPEG, TINY_JPEG]);
    tooMany.set("keep", "[]");
    expect((await author.call("PATCH", `/api/posts/${id}`, { form: tooMany })).status).toBe(400);

    expect((await author.call("DELETE", `/api/posts/${id}`)).status).toBe(200);
    expect(db().select().from(posts).where(eq(posts.id, id)).get()).toBeUndefined();
  });

  it("takes likes, 1–10 ratings and pending comments", async () => {
    const author = await member();
    const { id } = (await (
      await author.call("POST", "/api/posts", { form: postForm("Rate me") })
    ).json()) as { id: number };
    db().update(posts).set({ status: "approved" }).where(eq(posts.id, id)).run();

    const a = await guest();
    const b = await member("Reader");
    const rate = (who: TestBrowser, value: unknown) =>
      who.call("POST", `/api/posts/${id}/react`, { json: { kind: "star", value } });
    expect((await rate(a, 11)).status).toBe(400);
    expect((await rate(a, 0)).status).toBe(400);
    expect((await rate(a, 7.5)).status).toBe(400);
    expect((await (await rate(a, 7)).json()) as unknown).toMatchObject({
      totals: { stars: 700, ratings: 1 },
    });
    expect((await (await rate(b, 9)).json()) as unknown).toMatchObject({
      totals: { stars: 800, ratings: 2 },
    });
    // Changing a rating replaces it.
    expect((await (await rate(a, 9)).json()) as unknown).toMatchObject({
      totals: { stars: 900, ratings: 2 },
      mine: { star: 9 },
    });

    expect(
      (await a.call("POST", `/api/posts/${id}/comments`, { json: { body: "Nice" } })).status,
    ).toBe(401);
    const c = await b.call("POST", `/api/posts/${id}/comments`, { json: { body: "Nice!" } });
    expect(c.status).toBe(201);
    const { id: commentId } = (await c.json()) as { id: number };
    expect(
      db().select().from(postComments).where(eq(postComments.id, commentId)).get()?.status,
    ).toBe("pending");
  });
});

describe("suggestions, tips and trending", () => {
  it("holds visitor suggestions until approved, then counts likes and votes", async () => {
    const browser = await guest();
    const send = (json: unknown) => browser.call("POST", "/api/suggestions", { json });
    expect((await send({ kind: "palace", name: "X", district: "dhaka" })).status).toBe(400);
    expect((await send({ kind: "food", name: "Roshogolla", district: "nowhere" })).status).toBe(
      400,
    );
    const res = await send({
      kind: "food",
      name: "Porabarir chomchom",
      district: "tangail",
      body: "Sweet and dense.",
      submitter: "Nila",
    });
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: number };
    const approved = async () =>
      (
        (await (await browser.call("GET", "/api/community/approved?lang=en")).json()) as {
          items: { id: number; votes: number }[];
        }
      ).items;
    expect((await approved()).map((s) => s.id)).not.toContain(id);
    expect(
      (await browser.call("POST", `/api/suggestions/${id}/react`, { json: { kind: "vote" } }))
        .status,
    ).toBe(404);
    db().update(suggestions).set({ status: "approved" }).where(eq(suggestions.id, id)).run();
    await browser.call("POST", `/api/suggestions/${id}/react`, { json: { kind: "vote" } });
    await browser.call("POST", `/api/suggestions/${id}/react`, { json: { kind: "vote" } });
    expect((await approved()).find((s) => s.id === id)?.votes).toBe(1);
  });

  it("keeps tips and corrections private and limited per day", async () => {
    const browser = await guest();
    const send = (json: unknown) => browser.call("POST", "/api/guide-suggestions", { json });
    expect((await send({ kind: "tip", body: "No place given" })).status).toBe(400);
    expect((await send({ kind: "tip", place: "nilgiri-hill", body: "" })).status).toBe(400);
    for (let i = 0; i < DAILY.guide; i++) {
      const res = await send({
        kind: i % 2 ? "correction" : "warning",
        place: "nilgiri-hill",
        body: `The road is closed after 5 pm (${i})`,
        email: "me@example.com",
      });
      expect(res.status).toBe(201);
    }
    expect((await send({ kind: "tip", district: "bandarban", body: "One more" })).status).toBe(429);
    const rows = db().select().from(guideSuggestions).all();
    expect(rows.length).toBeGreaterThanOrEqual(DAILY.guide);
    expect(rows.every((r) => r.status === "new")).toBe(true);
  });

  it("counts one trending vote per visitor per place per season", async () => {
    const slug = "teesta-barrage-doani";
    const browser = await guest();
    const vote = async (who: TestBrowser, on = true) =>
      (await (await who.call("POST", "/api/trend/vote", { json: { place: slug, on } })).json()) as {
        votes: number;
        voted: boolean;
        season: string;
      };
    const before = (await (await browser.call("GET", `/api/trend/vote?place=${slug}`)).json()) as {
      votes: number;
      voted: boolean;
    };
    expect(before.voted).toBe(false);
    const first = await vote(browser);
    expect(first).toMatchObject({ votes: before.votes + 1, voted: true, season: seasonOf().key });
    expect((await vote(browser)).votes).toBe(before.votes + 1);
    const user = await member();
    expect((await vote(user)).votes).toBe(before.votes + 2);
    expect((await vote(browser, false)).votes).toBe(before.votes + 1);

    const trending = await listTrending("en");
    expect(trending.season.key).toBe(seasonOf().key);
    expect(trending.items.find((i) => i.place.slug === slug)?.votes).toBe(before.votes + 1);

    expect((await browser.call("POST", "/api/trend/vote", { json: { place: "x" } })).status).toBe(
      400,
    );
    const comment = await browser.call("POST", "/api/trend/comments", {
      json: { ref: slug, name: "Arif", body: "The barrage is full of water now." },
    });
    expect(comment.status).toBe(201);
    const row = db().select().from(trendComments).all().at(-1)!;
    expect(row).toMatchObject({ status: "pending", season: seasonOf().key });
  });
});

describe("text cleaning", () => {
  it("removes tags and invisible characters and enforces limits", () => {
    expect(plainText("<img src=x onerror=alert(1)>Hi\u200B <b>there</b>")).toBe("Hi there");
    expect(plainText("a\n\n\n\nb\r\nc")).toBe("a\n\nb\nc");
    expect(plainText("2 < 3 and 5 > 4")).toBe("2 < 3 and 5 > 4");
    expect(checkText("  ", 10, { required: true })).toEqual({ ok: false, reason: "missing" });
    expect(checkText("ভালো লাগলো", 10)).toEqual({ ok: true, value: "ভালো লাগলো" });
    expect(checkText("x".repeat(11), 10)).toEqual({ ok: false, reason: "long" });
  });
});
