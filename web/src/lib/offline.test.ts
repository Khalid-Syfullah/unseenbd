// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractAssets, keepPages, keptCount, removeKept } from "./offline";

class FakeCache {
  store = new Map<string, Response>();
  async put(req: string, res: Response) {
    this.store.set(req, res);
  }
  async match(req: string) {
    return this.store.get(req)?.clone();
  }
  async delete(req: string) {
    return this.store.delete(req);
  }
}

const cache = new FakeCache();

beforeEach(() => {
  cache.store.clear();
  vi.stubGlobal("caches", { open: async () => cache });
});
afterEach(() => vi.unstubAllGlobals());

describe("extractAssets", () => {
  it("finds scripts, styles and pictures served by the site", () => {
    const html =
      '<link href="/_next/static/css/a.css"><script src="/_next/static/chunks/b.js"></script>' +
      '<img src="/places/w640/x.webp" srcset="/places/w640/x.webp 640w, /places/w1200/x.webp 1200w">' +
      '<a href="/place/x">x</a><img src="https://example.com/y.png">';
    expect(extractAssets(html).sort()).toEqual([
      "/_next/static/chunks/b.js",
      "/_next/static/css/a.css",
      "/places/w1200/x.webp",
      "/places/w640/x.webp",
    ]);
  });
});

describe("keepPages", () => {
  it("stores pages and their assets, then reports and removes them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.startsWith("/place") || url.startsWith("/district")
          ? new Response('<img src="/places/w640/a.webp">', { status: 200 })
          : new Response("img", { status: 200 }),
      ),
    );
    const saved = await keepPages("d1", ["/district/d1", "/place/a"], ["/places/w640/c.webp"]);
    expect(saved).toBe(2);
    expect([...cache.store.keys()]).toEqual(
      expect.arrayContaining([
        "/district/d1",
        "/place/a",
        "/places/w640/a.webp",
        "/places/w640/c.webp",
      ]),
    );
    expect(await keptCount("d1")).toBe(2);
    await removeKept("d1");
    expect(await keptCount("d1")).toBe(0);
    expect(cache.store.has("/place/a")).toBe(false);
  });

  it("fails when no page can be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    await expect(keepPages("d2", ["/district/d2"], [])).rejects.toThrow();
    expect(await keptCount("d2")).toBe(0);
  });
});
