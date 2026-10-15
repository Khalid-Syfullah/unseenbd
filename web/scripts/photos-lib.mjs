// Pure helpers for scripts/fetch-photos.mjs (kept apart so they can be unit-tested offline).

/** "https://commons.wikimedia.org/wiki/File:A_b.jpg" -> "File:A b.jpg", or null if not a file page. */
export function commonsTitle(source) {
  let url;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (!/(^|\.)commons\.wikimedia\.org$/.test(url.hostname)) return null;
  const m = /^\/wiki\/(File:.+)$/.exec(url.pathname);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).replace(/_/g, " ");
  } catch {
    return null;
  }
}

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&nbsp;": " ",
};

/** Commons metadata values are small HTML snippets: drop tags and decode the common entities. */
export function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|nbsp|#039);/g, (e) => ENTITIES[e] ?? e)
    .replace(/\s+/g, " ")
    .trim();
}

/** Credit fields from one `imageinfo` entry; `fallback` fills what Commons does not say. */
export function creditFrom(info, fallback = {}) {
  const meta = info?.extmetadata ?? {};
  const value = (k) => stripHtml(meta[k]?.value);
  return {
    author: value("Artist") || fallback.by || "Unknown",
    license: value("LicenseShortName") || fallback.license || "",
    license_url: value("LicenseUrl") || "",
  };
}

/** The URL to download: the 1600 px thumbnail when there is one, else the original. */
export function downloadUrl(info) {
  return info?.thumburl || info?.url || null;
}

/** Wait time before retry `attempt` (0-based): 2 s, 4 s, 8 s … capped at 60 s. */
export function backoffMs(attempt) {
  return Math.min(60_000, 2000 * 2 ** attempt);
}
