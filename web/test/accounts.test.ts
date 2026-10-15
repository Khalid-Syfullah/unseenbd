// @vitest-environment node
import { generateKeyPairSync, sign, type JsonWebKey } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyGoogleCredential, type Jwk } from "@/server/auth/google";
import {
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  REGISTER_LIMIT,
  resetAuthLimits,
} from "@/server/auth/limits";
import { signInWithGoogle } from "@/server/auth/users";
import { accountLimiter } from "@/server/auth/http";
import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { freshEmail, freshIp, TestBrowser } from "./account-helpers";

beforeEach(() => {
  resetAuthLimits();
  accountLimiter.reset();
});
afterEach(() => {
  resetAuthLimits();
});

async function signedUp(email = freshEmail()) {
  const browser = new TestBrowser();
  const res = await browser.register(email);
  expect(res.status).toBe(201);
  return { browser, email };
}

describe("registration and sessions", () => {
  it("creates an account with an argon2id hash and an httpOnly, SameSite=Lax session", async () => {
    const browser = new TestBrowser();
    const email = freshEmail();
    const res = await browser.register(email, "a long passphrase", "Rahima Akter");
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      user: { handle: string; email: string };
      csrfToken: string;
    };
    expect(body.user.email).toBe(email);
    expect(body.user.handle).toMatch(/^rahima_akter/);
    expect(JSON.stringify(body)).not.toContain("argon2");

    const setCookie = res.headers.getSetCookie().join("\n");
    expect(setCookie).toMatch(/ubd_session=[\w-]+;.*HttpOnly/i);
    expect(setCookie).toMatch(/ubd_session=.*SameSite=lax/i);
    expect(setCookie).toMatch(/ubd_signed_in=1/);

    const row = getDb().select().from(users).where(eq(users.email, email)).get()!;
    expect(row.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    // Only the token's HMAC is stored, never the token itself.
    const token = browser.cookies.get("ubd_session")!;
    const stored = getDb().select().from(sessions).where(eq(sessions.userId, row.id)).all();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).not.toBe(token);
    expect(stored[0]!.id).toMatch(/^[0-9a-f]{64}$/);

    const meRes = await browser.call("GET", "/api/me");
    expect(meRes.status).toBe(200);
    expect(((await meRes.json()) as { csrfToken: string }).csrfToken).toBe(body.csrfToken);
  });

  it("refuses a second account for the same email and bad input", async () => {
    const { email } = await signedUp();
    const other = new TestBrowser();
    expect((await other.register(email.toUpperCase())).status).toBe(409);
    expect((await other.register(freshEmail(), "short")).status).toBe(400);
    expect((await other.register("not-an-email")).status).toBe(400);
  });

  it("signs in with the right password only, and signs out", async () => {
    const { email } = await signedUp();
    const browser = new TestBrowser();
    expect((await browser.login(email, "wrong password!")).status).toBe(401);
    const ok = await browser.login(email);
    expect(ok.status).toBe(200);
    expect((await browser.call("GET", "/api/me")).status).toBe(200);

    const out = await browser.call("POST", "/api/auth/logout");
    expect(out.status).toBe(200);
    expect(browser.cookies.has("ubd_session")).toBe(false);
    expect((await browser.call("GET", "/api/me")).status).toBe(401);
  });

  it("answers 401 for signed-in endpoints without a session", async () => {
    const browser = new TestBrowser();
    for (const path of ["/api/me", "/api/me/visited", "/api/trips", "/api/me/history"]) {
      expect((await browser.call("GET", path)).status).toBe(401);
    }
  });
});

describe("CSRF", () => {
  it("refuses login and register without the pre-sign-in token, or with a wrong one", async () => {
    const browser = new TestBrowser();
    const email = freshEmail();
    expect(
      (
        await browser.call("POST", "/api/auth/register", {
          json: { email, password: "long enough pass", name: "A" },
          csrf: false,
        })
      ).status,
    ).toBe(403);
    await browser.getCsrf();
    expect(
      (
        await browser.call("POST", "/api/auth/register", {
          json: { email, password: "long enough pass", name: "A" },
          csrf: "forged-token-value-123456",
        })
      ).status,
    ).toBe(403);
    // A token without its cookie (another browser's) is refused too.
    const attacker = new TestBrowser();
    const res = await attacker.call("POST", "/api/auth/login", {
      json: { email, password: "x" },
      csrf: browser.csrf!,
    });
    expect(res.status).toBe(403);
  });

  it("refuses every mutating account request without the session's token", async () => {
    const { browser } = await signedUp();
    const cases: [string, string, unknown][] = [
      ["POST", "/api/me/visited", { add: [1], remove: [] }],
      ["POST", "/api/me/wishlist", { set: { sajek: "want" }, clear: [] }],
      ["POST", "/api/me/world", { set: { NP: "wish" }, clear: [] }],
      ["POST", "/api/me/sync", { visited: [1] }],
      ["PATCH", "/api/me", { name: "X" }],
      ["DELETE", "/api/me/history", undefined],
      ["DELETE", "/api/me/photos", undefined],
      ["POST", "/api/trips", {}],
      ["POST", "/api/auth/logout", undefined],
    ];
    for (const [method, path, json] of cases) {
      const missing = await browser.call(method, path, { json, csrf: false });
      expect(missing.status, `${method} ${path} without token`).toBe(403);
      const wrong = await browser.call(method, path, { json, csrf: "x".repeat(43) });
      expect(wrong.status, `${method} ${path} with a wrong token`).toBe(403);
    }
    // Still signed in and nothing changed.
    const visited = await browser.call("GET", "/api/me/visited");
    expect(await visited.json()).toEqual({ ids: [] });
  });

  it("refuses cross-site requests even with the right token", async () => {
    const { browser } = await signedUp();
    const crossSite = await browser.call("POST", "/api/me/visited", {
      json: { add: [5], remove: [] },
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(crossSite.status).toBe(403);
    const foreignOrigin = await browser.call("POST", "/api/me/visited", {
      json: { add: [5], remove: [] },
      headers: { origin: "https://evil.example" },
    });
    expect(foreignOrigin.status).toBe(403);
    const sameOrigin = await browser.call("POST", "/api/me/visited", {
      json: { add: [5], remove: [] },
      headers: { origin: "http://localhost" },
    });
    expect(sameOrigin.status).toBe(200);
  });
});

describe("auth rate limits", () => {
  it(`allows ${LOGIN_IP_LIMIT} login tries per IP, then 429 with Retry-After`, async () => {
    const browser = new TestBrowser();
    await browser.getCsrf();
    for (let i = 0; i < LOGIN_IP_LIMIT; i += 1) {
      const res = await browser.call("POST", "/api/auth/login", {
        json: { email: freshEmail(), password: "nope nope nope" },
      });
      expect(res.status).toBe(401);
    }
    const limited = await browser.call("POST", "/api/auth/login", {
      json: { email: freshEmail(), password: "nope nope nope" },
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it(`allows ${LOGIN_EMAIL_LIMIT} tries per email across IPs`, async () => {
    const { email } = await signedUp();
    for (let i = 0; i < LOGIN_EMAIL_LIMIT; i += 1) {
      expect((await new TestBrowser(freshIp()).login(email, "wrong password")).status).toBe(401);
    }
    // Even the right password from a new address waits now.
    expect((await new TestBrowser(freshIp()).login(email)).status).toBe(429);
  });

  it(`allows ${REGISTER_LIMIT} sign-ups per IP per hour`, async () => {
    const ip = freshIp();
    for (let i = 0; i < REGISTER_LIMIT; i += 1) {
      expect((await new TestBrowser(ip).register(freshEmail())).status).toBe(201);
    }
    expect((await new TestBrowser(ip).register(freshEmail())).status).toBe(429);
  });
});

describe("sign-in merge", () => {
  it("keeps what was ticked while logged out and adds it to the account", async () => {
    const { browser, email } = await signedUp();
    // Another device already added Sylhet (28) and a bucket entry.
    await browser.call("POST", "/api/me/visited", { json: { add: [28], remove: [] } });
    await browser.call("POST", "/api/me/wishlist", {
      json: { set: { "sajek-valley": "want" }, clear: [] },
    });
    await browser.call("POST", "/api/me/story", {
      json: { values: { birth: 1, work: 19 }, times: { birth: 2000, work: 5000 } },
    });

    // This device ticked Dhaka and Cox's Bazar logged out, then signs in.
    const phone = new TestBrowser();
    expect((await phone.login(email)).status).toBe(200);
    const res = await phone.call("POST", "/api/me/sync", {
      json: {
        visited: [1, 19, 999],
        bucket: { "sajek-valley": "been", "ratargul-swamp-forest": "want", "Bad Slug": "want" },
        world: { NP: "visited", "not valid!": "wish" },
        story: { values: { birth: 64, work: 2 }, times: { birth: 9000, work: 1000 } },
      },
    });
    expect(res.status).toBe(200);
    const merged = (await res.json()) as {
      visited: number[];
      bucket: Record<string, string>;
      world: Record<string, string>;
      story: { values: Record<string, number | null>; times: Record<string, number> };
    };
    expect(merged.visited).toEqual([1, 19, 28]);
    expect(merged.bucket).toEqual({ "sajek-valley": "been", "ratargul-swamp-forest": "want" });
    expect(merged.world).toEqual({ NP: "visited" });
    // Newest answer wins per field.
    expect(merged.story.values).toMatchObject({ birth: 64, work: 19 });
  });
});

describe("saved trips", () => {
  const input = {
    start: 1,
    destinations: [19],
    places: [],
    optimize: true,
    returnToStart: true,
    people: 2,
    level: "mid",
  };

  it("creates, lists, shares and deletes a trip; private trips stay private", async () => {
    const { browser } = await signedUp();
    const created = await browser.call("POST", "/api/trips", {
      json: { title: "Dhaka → Cox's Bazar", input, plan: { days: [{}, {}, {}] }, totalCost: 22200 },
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: number };

    const list = (await (await browser.call("GET", "/api/trips")).json()) as {
      trips: { id: number; totalCost: number; days: number; isPublic: boolean }[];
    };
    expect(list.trips[0]).toMatchObject({ id, totalCost: 22200, days: 3, isPublic: false });

    const stranger = new TestBrowser();
    expect((await stranger.call("GET", `/api/trips/${id}`)).status).toBe(404);
    expect((await browser.call("GET", `/api/trips/${id}`)).status).toBe(200);

    const shared = await browser.call("PATCH", `/api/trips/${id}`, { json: { isPublic: true } });
    expect(shared.status).toBe(200);
    const seen = await stranger.call("GET", `/api/trips/${id}`);
    expect(seen.status).toBe(200);
    expect(((await seen.json()) as { trip: { owner: boolean } }).trip.owner).toBe(false);

    // Someone else cannot change or delete it.
    const other = (await signedUp()).browser;
    expect((await other.call("DELETE", `/api/trips/${id}`)).status).toBe(404);
    expect((await browser.call("DELETE", `/api/trips/${id}`)).status).toBe(200);
    expect((await stranger.call("GET", `/api/trips/${id}`)).status).toBe(404);
  });

  it("refuses input that is not a plan", async () => {
    const { browser } = await signedUp();
    const bad = await browser.call("POST", "/api/trips", {
      json: { input: { ...input, start: 99 }, totalCost: 1 },
    });
    expect(bad.status).toBe(400);
  });

  it("adds the trips' totals to the summary", async () => {
    const { browser } = await signedUp();
    for (const totalCost of [1000, 2500]) {
      await browser.call("POST", "/api/trips", { json: { input, totalCost } });
    }
    await browser.call("POST", "/api/me/visited", { json: { add: [1, 2, 3], remove: [] } });
    const summary = await (await browser.call("GET", "/api/me/summary")).json();
    expect(summary).toMatchObject({ trips: 2, totalSpend: 3500, visited: [1, 2, 3], photos: 0 });
  });
});

describe("view history", () => {
  it("records views (once per page per half hour), pages them and deletes them", async () => {
    const { browser } = await signedUp();
    for (let placeId = 1; placeId <= 25; placeId += 1) {
      const res = await browser.call("POST", "/api/me/history", { json: { placeId } });
      expect(res.status).toBe(200);
    }
    await browser.call("POST", "/api/me/history", { json: { placeId: 25 } });
    await browser.call("POST", "/api/me/history", { json: { districtId: 3 } });
    expect(
      (await browser.call("POST", "/api/me/history", { json: { placeId: 99999 } })).status,
    ).toBe(400);

    const first = (await (await browser.call("GET", "/api/me/history?lang=en")).json()) as {
      items: { place: { slug: string } | null; district: { slug: string } | null }[];
      total: number;
      pageCount: number;
    };
    expect(first.total).toBe(26);
    expect(first.pageCount).toBe(2);
    expect(first.items).toHaveLength(20);
    expect(first.items[0]!.district).not.toBeNull();
    const second = (await (await browser.call("GET", "/api/me/history?page=2")).json()) as {
      items: unknown[];
      page: number;
    };
    expect(second.page).toBe(2);
    expect(second.items).toHaveLength(6);
    expect((await browser.call("GET", "/api/me/history?page=x")).status).toBe(400);

    expect((await browser.call("DELETE", "/api/me/history")).status).toBe(200);
    const empty = (await (await browser.call("GET", "/api/me/history")).json()) as {
      total: number;
    };
    expect(empty.total).toBe(0);
  });
});

describe("profile settings and deletion", () => {
  it("changes name and handle, refuses a taken handle", async () => {
    const a = await signedUp();
    const b = await signedUp();
    const ok = await a.browser.call("PATCH", "/api/me", {
      json: { name: "Nadia", handle: "@Nadia_BD", locale: "en", theme: "dark", publicMap: true },
    });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { user: unknown }).user).toMatchObject({
      name: "Nadia",
      handle: "nadia_bd",
      locale: "en",
      theme: "dark",
      publicMap: true,
    });
    const taken = await b.browser.call("PATCH", "/api/me", { json: { handle: "nadia_bd" } });
    expect(taken.status).toBe(409);
    const invalid = await b.browser.call("PATCH", "/api/me", { json: { handle: "admin" } });
    expect(invalid.status).toBe(400);

    const profile = await new TestBrowser().call("GET", "/api/users/nadia_bd");
    expect(profile.status).toBe(200);
    const body = (await profile.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ name: "Nadia", handle: "nadia_bd", visited: [] });
    expect(JSON.stringify(body)).not.toContain("@example.com");
  });

  it("deletes the account only with the handle typed, and everything with it", async () => {
    const { browser, email } = await signedUp();
    await browser.call("POST", "/api/me/visited", { json: { add: [4], remove: [] } });
    const me = (await (await browser.call("GET", "/api/me")).json()) as {
      user: { id: number; handle: string };
    };
    expect((await browser.call("DELETE", "/api/me", { json: { confirm: "nope" } })).status).toBe(
      400,
    );
    const res = await browser.call("DELETE", "/api/me", {
      json: { confirm: `@${me.user.handle}` },
    });
    expect(res.status).toBe(200);
    expect(getDb().select().from(users).where(eq(users.id, me.user.id)).get()).toBeUndefined();
    expect((await browser.call("GET", "/api/me")).status).toBe(401);
    expect((await new TestBrowser().login(email)).status).toBe(401);
  });
});

describe("Google sign-in", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...(publicKey.export({ format: "jwk" }) as JsonWebKey), kid: "k1", alg: "RS256" };
  const keys = async () => [jwk as Jwk];
  const CLIENT = "test-client.apps.googleusercontent.com";
  const now = Date.UTC(2026, 9, 15, 8);

  function token(claims: Record<string, unknown>, kid = "k1") {
    const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const head = enc({ alg: "RS256", kid, typ: "JWT" });
    const body = enc({
      iss: "https://accounts.google.com",
      aud: CLIENT,
      sub: "1234567890",
      email: "g.user@example.com",
      email_verified: true,
      name: "Google User",
      iat: now / 1000 - 10,
      exp: now / 1000 + 3600,
      ...claims,
    });
    const sig = sign("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey).toString(
      "base64url",
    );
    return `${head}.${body}.${sig}`;
  }

  it("accepts a valid credential and rejects tampered, foreign or expired ones", async () => {
    const opts = { keys, now };
    expect(await verifyGoogleCredential(token({}), CLIENT, opts)).toMatchObject({
      sub: "1234567890",
      email: "g.user@example.com",
      emailVerified: true,
    });
    expect(await verifyGoogleCredential(token({ aud: "other" }), CLIENT, opts)).toBeNull();
    expect(await verifyGoogleCredential(token({ iss: "evil" }), CLIENT, opts)).toBeNull();
    expect(
      await verifyGoogleCredential(token({ exp: now / 1000 - 3600 }), CLIENT, opts),
    ).toBeNull();
    expect(await verifyGoogleCredential(token({}, "unknown"), CLIENT, opts)).toBeNull();
    const [h, , s] = token({}).split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "x", aud: CLIENT })).toString("base64url");
    expect(await verifyGoogleCredential(`${h}.${forged}.${s}`, CLIENT, opts)).toBeNull();
    expect(await verifyGoogleCredential("garbage", CLIENT, opts)).toBeNull();
  });

  it("links a Google sign-in to the account with the same verified email", async () => {
    const { email } = await signedUp();
    const linked = signInWithGoogle({ sub: `g-${email}`, email, emailVerified: true, name: "X" });
    const row = getDb().select().from(users).where(eq(users.email, email)).get()!;
    expect(linked.id).toBe(row.id);
    expect(row.googleSub).toBe(`g-${email}`);
    // Unverified emails never link; they make a new account without the email.
    const other = signInWithGoogle({
      sub: `g2-${email}`,
      email,
      emailVerified: false,
      name: "Y",
    });
    expect(other.id).not.toBe(row.id);
    expect(other.email).toBeNull();
  });
});
