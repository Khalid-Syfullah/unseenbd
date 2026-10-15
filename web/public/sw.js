/*
 * Unseen BD service worker (FEATURES.md §1.7). Plain JavaScript, served as-is from /sw.js.
 *
 *  - Precaches a small shell: the offline pages, manifest and icons.
 *  - Pages: network first, the last good copy is kept and used when the network fails
 *    (including the browser-only tools in OFFLINE_APPS, which Next.js marks no-store).
 *  - Images, fonts and built scripts: cache first.
 *  - "Keep offline" (src/lib/offline.ts) stores a district's pages and pictures in the
 *    `ubd-kept` cache, which is never trimmed; every lookup below checks it.
 *  - Never cached: /api/, sign-in and account pages, admin, and anything marked no-store.
 *
 * Bump VERSION to drop the old page and asset caches on the next visit.
 */
const VERSION = "v2";
const SHELL = `ubd-shell-${VERSION}`;
const PAGES = `ubd-pages-${VERSION}`;
const ASSETS = `ubd-assets-${VERSION}`;
const KEPT = "ubd-kept";

const SHELL_URLS = [
  "/offline",
  "/en/offline",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/brand/icon-192.png",
  "/illustrations/not-found.svg",
];
const MAX_PAGES = 60;
/*
 * Tools that run in the browser and keep their state in localStorage (My Bangladesh, My World,
 * bucket list, planner, games). Next.js marks them no-store because their query string can carry
 * a shared link, but without a query they hold nothing personal, so they are kept for offline use.
 */
const OFFLINE_APPS = /^\/(?:my-bangladesh|world|bucket-list|plan|trip-cost|play|near-me)$/;
const MAX_ASSETS = 400;

const LOCALE_PREFIX = /^\/(?:en|zh|fr|de|it|ja)(?=\/|$)/;
const NEVER = /^\/(?:api|login|register|logout|profile|admin|my-listings|add-listing|s|u|trip)(?:\/|$)/;
const STATIC_DIRS = /^\/(?:_next\/static|places|photos|media|brand|icons|illustrations|social|maps|stamps|badges|card-themes|fonts)\//;

/** The built scripts and styles an offline page needs, so it still runs when shown offline. */
async function cacheShellAssets(cache) {
  const found = new Set();
  for (const page of ["/offline", "/en/offline"]) {
    const response = await cache.match(page);
    if (!response) continue;
    const html = await response.text();
    for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) found.add(m[1]);
  }
  await Promise.allSettled([...found].map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(async (cache) => {
        await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
        await cacheShellAssets(cache);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("ubd-") && n !== KEPT && ![SHELL, PAGES, ASSETS].includes(n))
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function cacheable(response, force) {
  if (!response || !response.ok || response.type === "opaque") return false;
  return force || !/no-store/i.test(response.headers.get("Cache-Control") || "");
}

async function remember(name, max, request, response, force = false) {
  if (!cacheable(response, force)) return;
  const cache = await caches.open(name);
  await cache.put(request, response);
  await trim(name, max);
}

function offlinePage(pathname) {
  return caches.match(LOCALE_PREFIX.test(pathname) ? "/en/offline" : "/offline");
}

async function pageResponse(request, pathname, keep) {
  try {
    const response = await fetch(request);
    if (response.ok && (response.headers.get("Content-Type") || "").includes("text/html")) {
      await remember(PAGES, MAX_PAGES, request, response.clone(), keep);
    }
    return response;
  } catch {
    const hit =
      (await caches.match(request, { ignoreVary: true })) ||
      (await caches.match(request, { ignoreSearch: true, ignoreVary: true }));
    return hit || (await offlinePage(pathname)) || Response.error();
  }
}

async function assetResponse(request) {
  const hit = await caches.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  await remember(ASSETS, MAX_ASSETS, request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.replace(LOCALE_PREFIX, "") || "/";
  if (NEVER.test(path) || request.headers.get("RSC")) return;

  if (request.mode === "navigate") {
    event.respondWith(pageResponse(request, url.pathname, OFFLINE_APPS.test(path) && !url.search));
  } else if (STATIC_DIRS.test(url.pathname) || /\.(?:woff2?|css|js|webp|png|svg|jpg|jpeg|ico)$/.test(url.pathname)) {
    event.respondWith(assetResponse(request));
  }
});
