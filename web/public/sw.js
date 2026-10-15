/*
 * Unseen BD service worker (FEATURES.md §1.7). Plain JavaScript, served as-is from /sw.js.
 *
 *  - Precaches a small shell: the offline pages, manifest and icons.
 *  - Pages: network first, the last good copy is kept and used when the network fails.
 *  - Images, fonts and built scripts: cache first.
 *  - "Keep offline" (src/lib/offline.ts) stores a district's pages and pictures in the
 *    `ubd-kept` cache, which is never trimmed; every lookup below checks it.
 *  - Never cached: /api/, sign-in and account pages, admin, and anything marked no-store.
 *
 * Bump VERSION to drop the old page and asset caches on the next visit.
 */
const VERSION = "v1";
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
const MAX_ASSETS = 400;

const LOCALE_PREFIX = /^\/(?:en|zh|fr|de|it|ja)(?=\/|$)/;
const NEVER = /^\/(?:api|login|register|logout|profile|admin|my-listings|add-listing|s|u|trip)(?:\/|$)/;
const STATIC_DIRS = /^\/(?:_next\/static|places|photos|media|brand|icons|illustrations|social|maps|stamps|badges|card-themes|fonts)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))))
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

function cacheable(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  return !/no-store/i.test(response.headers.get("Cache-Control") || "");
}

async function remember(name, max, request, response) {
  if (!cacheable(response)) return;
  const cache = await caches.open(name);
  await cache.put(request, response);
  await trim(name, max);
}

function offlinePage(pathname) {
  return caches.match(LOCALE_PREFIX.test(pathname) ? "/en/offline" : "/offline");
}

async function pageResponse(request, pathname) {
  try {
    const response = await fetch(request);
    if (response.ok && (response.headers.get("Content-Type") || "").includes("text/html")) {
      await remember(PAGES, MAX_PAGES, request, response.clone());
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
    event.respondWith(pageResponse(request, url.pathname));
  } else if (STATIC_DIRS.test(url.pathname) || /\.(?:woff2?|css|js|webp|png|svg|jpg|jpeg|ico)$/.test(url.pathname)) {
    event.respondWith(assetResponse(request));
  }
});
