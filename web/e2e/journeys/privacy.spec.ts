import { expect, test } from "@playwright/test";
import { hydrated } from "../support";

/**
 * MASTER_PROMPT §1 and §10: no third-party trackers in the network panel, and the security
 * headers from the release review.
 */

const PAGES = [
  "/",
  "/en/explore",
  "/en/place/nilgiri-hill",
  "/en/district/sylhet",
  "/en/plan",
  "/en/my-bangladesh",
  "/en/play",
  "/en/gallery",
  "/en/upload",
  "/en/login",
];

test.describe("Privacy and security", () => {
  test("pages make no request to another origin", async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const foreign: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.origin !== origin) foreign.push(request.url());
    });
    for (const path of PAGES) {
      await page.goto(path);
      await hydrated(page);
      // Scroll through so lazy images and below-the-fold islands load too.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 800) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
      });
      await hydrated(page);
    }
    // (Google Identity loads on /login only when GOOGLE_CLIENT_ID is set; it is not in tests.)
    expect(foreign).toEqual([]);
  });

  test("security headers on pages and API responses", async ({ request }) => {
    for (const path of ["/", "/en/place/nilgiri-hill", "/api/places?district=sylhet"]) {
      const headers = (await request.get(path)).headers();
      const csp = headers["content-security-policy"] ?? "";
      expect(csp, path).toContain("default-src 'self'");
      expect(csp, path).toContain("frame-ancestors 'none'");
      expect(csp, path).toContain("object-src 'none'");
      expect(csp, path).not.toContain("accounts.google.com");
      expect(headers["strict-transport-security"], path).toMatch(/max-age=\d+/);
      expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(headers["permissions-policy"], path).toContain("geolocation=(self)");
      expect(headers["x-content-type-options"], path).toBe("nosniff");
      expect(headers["x-frame-options"], path).toBe("DENY");
      expect(headers["x-powered-by"], path).toBeUndefined();
    }
    // Google Identity is allowed on the sign-in pages only.
    for (const path of ["/login", "/en/register"]) {
      const csp = (await request.get(path)).headers()["content-security-policy"] ?? "";
      expect(csp, path).toContain("https://accounts.google.com/gsi/client");
      expect(csp, path).toContain("frame-ancestors 'none'");
    }
  });

  test("health endpoint reports the database and version", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toBe("no-store");
    const body = (await res.json()) as { status: string; version: string; db: { places: number } };
    expect(body.status).toBe("ok");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.db.places).toBe(257);
  });
});
