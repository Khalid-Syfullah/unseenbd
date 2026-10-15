// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import ShortLinkPage from "@/app/[lang]/s/[code]/page";
import { POST } from "@/app/api/share/route";
import { decodeDistrictIds, encodeDistrictIds } from "@/lib/visited/encode";
import { clientIp, createRateLimiter } from "@/server/rate-limit";
import {
  createShortLink,
  getShortLink,
  isShortCode,
  SHORT_LINK_LIMIT,
  shortLinkLimiter,
} from "@/server/short-links";

function post(body: unknown, { ip = "203.0.113.7", type = "application/json" } = {}) {
  return new NextRequest(new URL("/api/share", "http://localhost"), {
    method: "POST",
    headers: { "content-type": type, "x-forwarded-for": `198.18.0.9, ${ip}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Runs the /s/[code] page and returns where it redirects (or the 404 digest). */
async function follow(lang: string, code: string): Promise<string> {
  try {
    await ShortLinkPage({ params: Promise.resolve({ lang, code }) });
  } catch (error) {
    const digest = String((error as { digest?: string }).digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT")) return digest.split(";")[2]!;
    return digest;
  }
  throw new Error("the page neither redirected nor 404ed");
}

afterEach(() => shortLinkLimiter.reset());

describe("short links", () => {
  it("stores ids and name and gives a 6-character code; same input, same code", () => {
    const a = createShortLink([28, 1, 1], "  Rahim ");
    expect(isShortCode(a.code)).toBe(true);
    expect(a.code).toHaveLength(6);
    expect(a).toMatchObject({ ids: [1, 28], name: "Rahim" });
    expect(createShortLink([1, 28], "Rahim").code).toBe(a.code);
    expect(createShortLink([1, 28], "").code).not.toBe(a.code);
    expect(getShortLink(a.code)).toEqual({ code: a.code, ids: [1, 28], name: "Rahim" });
    expect(getShortLink("zzzzzz")).toBeNull();
    expect(getShortLink("../etc")).toBeNull();
  });
});

describe("POST /api/share and /s/[code]", () => {
  it("round-trips: the short link redirects to the long link with the same districts", async () => {
    const res = await POST(post({ ids: [19, 1, 28], name: "রহিম" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { code: string; path: string; ids: number[] };
    expect(body.path).toBe(`/s/${body.code}`);
    expect(body.ids).toEqual([1, 19, 28]);

    const target = await follow("en", body.code);
    const url = new URL(target, "http://localhost");
    expect(url.pathname).toBe("/en/my-bangladesh");
    expect(url.searchParams.get("v")).toBe(encodeDistrictIds([1, 19, 28]));
    expect(decodeDistrictIds(url.searchParams.get("v"))).toEqual([1, 19, 28]);
    expect(url.searchParams.get("n")).toBe("রহিম");

    const bn = new URL(await follow("bn", body.code), "http://localhost");
    expect(bn.pathname).toBe("/my-bangladesh");
  });

  it("404s unknown codes", async () => {
    expect(await follow("en", "abcdef")).toMatch(/404/);
    expect(await follow("en", "nope")).toMatch(/404/);
  });

  it("rejects bad bodies", async () => {
    expect((await POST(post({ ids: [] }))).status).toBe(400);
    expect((await POST(post({ ids: [0] }))).status).toBe(400);
    expect((await POST(post({ ids: [1, 65] }))).status).toBe(400);
    expect((await POST(post({ ids: ["1"] }))).status).toBe(400);
    expect((await POST(post({ ids: [1], name: 5 }))).status).toBe(400);
    expect((await POST(post({ ids: [1], extra: "x".repeat(3000) }))).status).toBe(413);
    expect((await POST(post("{not json"))).status).toBe(400);
    expect((await POST(post([1, 2]))).status).toBe(400);
    expect((await POST(post({ ids: [1] }, { type: "text/plain" }))).status).toBe(415);
  });

  it("rate-limits by IP", async () => {
    for (let i = 0; i < SHORT_LINK_LIMIT; i += 1) {
      expect((await POST(post({ ids: [1 + (i % 64)] }, { ip: "198.51.100.1" }))).status).toBe(201);
    }
    const limited = await POST(post({ ids: [1] }, { ip: "198.51.100.1" }));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
    // Another address is unaffected.
    expect((await POST(post({ ids: [1] }, { ip: "198.51.100.2" }))).status).toBe(201);
  });
});

describe("rate limiter", () => {
  it("allows `limit` hits per window, then opens again", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("a", 10).ok).toBe(true);
    expect(limiter.hit("a", 20)).toEqual({ ok: false, retryAfter: 1 });
    expect(limiter.hit("b", 20).ok).toBe(true);
    expect(limiter.hit("a", 1000).ok).toBe(true);
  });

  it("reads the client IP from proxy headers", () => {
    // The proxy appends the address it saw; earlier hops are whatever the client sent.
    expect(clientIp(new Headers({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(
      clientIp(new Headers({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4, 9.9.9.9" })),
    ).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
