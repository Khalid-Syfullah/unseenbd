/**
 * "Keep offline" for a district (FEATURES.md §1.7): the page, its places and their pictures are
 * fetched into the `ubd-kept` cache, which the service worker (`public/sw.js`) reads when the
 * network is down. A small marker entry per district records what was kept, so nothing needs to
 * live in local storage. All functions are safe to call without the Cache API (they do nothing).
 */

export const KEPT_CACHE = "ubd-kept";
const MARKER_PREFIX = "/__kept/";

export function offlineSupported(): boolean {
  return typeof caches !== "undefined" && typeof fetch === "function";
}

/** The scripts, styles and pictures a page's HTML points at, so the kept copy can run offline. */
export function extractAssets(html: string): string[] {
  const found = new Set<string>();
  const re = /(?:src|href|srcset|imagesrcset)=["']([^"']+)["']/g;
  for (const m of html.matchAll(re)) {
    for (const part of m[1]!.split(",")) {
      const url = part.trim().split(/\s+/)[0] ?? "";
      if (/^\/(?:_next\/static|places|photos|media|brand|illustrations|icons|maps)\//.test(url)) {
        found.add(url.replace(/&amp;/g, "&"));
      }
    }
  }
  return [...found];
}

type Progress = (done: number, total: number) => void;

/**
 * Stores `pages` (paths) and `images` (paths) under `key`. Returns the number of pages saved;
 * throws when not a single page could be fetched (offline, or the server refused).
 */
export async function keepPages(
  key: string,
  pages: string[],
  images: string[],
  onProgress?: Progress,
): Promise<number> {
  if (!offlineSupported()) return 0;
  const cache = await caches.open(KEPT_CACHE);
  const queue = new Set<string>(images);
  let saved = 0;
  let done = 0;
  const total = pages.length + images.length;

  for (const page of pages) {
    try {
      const response = await fetch(page, { credentials: "same-origin" });
      if (response.ok) {
        const html = await response.clone().text();
        await cache.put(page, response);
        for (const asset of extractAssets(html)) queue.add(asset);
        saved++;
      }
    } catch {
      // keep going: one failed page should not lose the others
    }
    onProgress?.(++done, total + queue.size);
  }
  if (saved === 0) throw new Error("offline: no page could be saved");

  for (const asset of queue) {
    try {
      if (!(await cache.match(asset))) {
        const response = await fetch(asset, { credentials: "same-origin" });
        if (response.ok) await cache.put(asset, response);
      }
    } catch {
      // a missing picture only leaves a gap
    }
    onProgress?.(Math.min(++done, total + queue.size), total + queue.size);
  }

  await cache.put(
    `${MARKER_PREFIX}${encodeURIComponent(key)}`,
    new Response(JSON.stringify({ pages, savedAt: Date.now(), saved }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  return saved;
}

/** How many pages were kept under `key`, or 0. */
export async function keptCount(key: string): Promise<number> {
  if (!offlineSupported()) return 0;
  try {
    const cache = await caches.open(KEPT_CACHE);
    const marker = await cache.match(`${MARKER_PREFIX}${encodeURIComponent(key)}`);
    if (!marker) return 0;
    const body = (await marker.json()) as { saved?: number };
    return typeof body.saved === "number" ? body.saved : 0;
  } catch {
    return 0;
  }
}

/** Removes the kept pages of `key` (pictures stay: other districts may share them). */
export async function removeKept(key: string): Promise<void> {
  if (!offlineSupported()) return;
  const cache = await caches.open(KEPT_CACHE);
  const markerUrl = `${MARKER_PREFIX}${encodeURIComponent(key)}`;
  const marker = await cache.match(markerUrl);
  if (marker) {
    const body = (await marker.json()) as { pages?: string[] };
    for (const page of body.pages ?? []) await cache.delete(page);
  }
  await cache.delete(markerUrl);
}
