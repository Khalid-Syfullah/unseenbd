import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * MASTER_PROMPT §10: every route in §3 renders on the server in bn and en with correct metadata.
 * Plain HTTP requests (no JavaScript), so what is checked is the server-rendered HTML.
 */

/** Public routes, one example each for the dynamic ones. */
const PUBLIC = [
  "/",
  "/explore",
  "/place/nilgiri-hill",
  "/district/sylhet",
  "/kind/beach",
  "/month/november",
  "/unseen",
  "/best-places?division=sylhet",
  "/near-me",
  "/search?q=sylhet",
  "/bucket-list",
  "/plan",
  "/trip-cost",
  "/routes",
  "/route/bandarban-to-dhaka",
  "/trains",
  "/train/suborno-express-701",
  "/safety",
  "/foreign-tour",
  "/my-bangladesh",
  "/world",
  "/play",
  "/quiz/bangladesh",
  "/quiz/famous",
  "/quiz/personality",
  "/challenge?c=1.2.3",
  "/gallery",
  "/upload",
  "/stay",
  "/restaurants",
  "/shopping",
  "/listings",
  "/add-listing?kind=business",
  "/about",
];

/** Sign-in and account pages: rendered, but kept out of search engines. */
const PRIVATE = ["/login", "/register", "/my-listings"];

function localized(lang: "bn" | "en", path: string): string {
  if (lang === "bn") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

function attr(html: string, pattern: RegExp): string | null {
  return pattern.exec(html)?.[1] ?? null;
}

async function html(request: APIRequestContext, path: string) {
  const res = await request.get(path, { maxRedirects: 0 });
  return { status: res.status(), body: await res.text(), headers: res.headers() };
}

test.describe("Routes", () => {
  for (const lang of ["bn", "en"] as const) {
    test(`every public route renders server-side in ${lang} with metadata`, async ({ request }) => {
      const titles = new Map<string, string>();
      for (const route of PUBLIC) {
        const path = localized(lang, route);
        const { status, body } = await html(request, path);
        expect(status, path).toBe(200);
        expect(attr(body, /<html[^>]*\slang="([^"]+)"/), path).toBe(lang);
        const title = attr(body, /<title>([^<]+)<\/title>/);
        expect(title, `${path} title`).toBeTruthy();
        expect(attr(body, /<meta name="description" content="([^"]+)"/), path).toBeTruthy();
        expect(body, `${path} h1`).toMatch(/<h1[\s>]/);
        // Canonical + hreflang (bn, en, x-default = en) on pages meant for search engines.
        if (!route.includes("?")) {
          const canonical = attr(body, /<link rel="canonical" href="([^"]+)"/);
          expect(canonical, `${path} canonical`).toMatch(
            new RegExp(`${localized(lang, route).replace(/[/]$/, "")}$`),
          );
          expect(body, path).toMatch(/<link rel="alternate" hrefLang="bn" href="[^"]+"/);
          expect(body, path).toMatch(/<link rel="alternate" hrefLang="en" href="[^"]+\/en[^"]*"/);
          expect(body, path).toMatch(/<link rel="alternate" hrefLang="x-default" href="[^"]+"/);
          expect(body, path).toMatch(/<meta property="og:title"/);
        }
        if (!route.includes("?")) titles.set(path, title!);
      }
      // Titles are unique across the indexable pages.
      expect(new Set(titles.values()).size).toBe(titles.size);
    });
  }

  test("place, district, month and train titles follow the SEO patterns", async ({ request }) => {
    const title = async (path: string) =>
      attr((await html(request, path)).body, /<title>([^<]+)<\/title>/)!.replace(
        /&#x27;|&#39;/g,
        "'",
      );
    expect(await title("/en/place/nilgiri-hill")).toMatch(
      /^Nilgiri.*, Bandarban: how to get there and when to go/,
    );
    expect(await title("/en/district/sylhet")).toMatch(/^Sylhet district: \d+ places to visit/);
    expect(await title("/en/month/november")).toMatch(
      /^Places to visit in Bangladesh in November: \d+ places in season/,
    );
    expect(await title("/en/train/suborno-express-701")).toMatch(
      /Suborno Express \(701\) timetable, stops and fares/,
    );
  });

  test("place pages carry TouristAttraction and breadcrumb JSON-LD", async ({ request }) => {
    const { body } = await html(request, "/en/place/nilgiri-hill");
    expect(body).toContain('"@type":"TouristAttraction"');
    expect(body).toContain('"@type":"GeoCoordinates"');
    expect(body).toContain('"@type":"BreadcrumbList"');
  });

  test("sign-in and account pages render but are not indexed", async ({ request }) => {
    for (const lang of ["bn", "en"] as const) {
      for (const route of PRIVATE) {
        const path = localized(lang, route);
        const { status, body } = await html(request, path);
        expect(status, path).toBe(200);
        expect(body, path).toMatch(/<meta name="robots" content="noindex/);
      }
      // Signed out, the profile sends you to sign in.
      const profile = await html(request, localized(lang, "/profile"));
      expect([302, 303, 307, 308]).toContain(profile.status);
      expect(profile.headers.location).toMatch(/\/login\?next=/);
    }
    // The admin area does not exist for visitors.
    expect((await html(request, "/en/admin")).status).toBe(404);
  });

  test("unknown routes get the friendly 404 with links to all 64 districts", async ({
    request,
  }) => {
    for (const path of ["/no-such-page", "/en/no-such-page"]) {
      const { status, body } = await html(request, path);
      expect(status, path).toBe(404);
      expect(body, path).toMatch(/href="(\/en)?\/explore"/);
      expect(
        body.match(/href="(?:\/en)?\/district\/[a-z-]+"/g)?.length ?? 0,
      ).toBeGreaterThanOrEqual(64);
    }
    // An unknown slug under a real route answers 404 too (its UI is the localised not-found page).
    expect((await html(request, "/en/place/no-such-place")).status).toBe(404);
  });

  test("sitemap and robots", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/place/nilgiri-hill");
    expect(sitemap).toContain("/en/place/nilgiri-hill");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/api\//);
    expect(robots).toMatch(/Disallow: \/login/);
  });
});
