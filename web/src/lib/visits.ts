/**
 * Which page views are counted, and under what name. Visits are kept only as a counter per page
 * per day (no cookies, no IPs, no visitor ids), so the page name has to be bounded: known
 * sections count under their route pattern, and a place or district page also under its own
 * slug (the server checks the slug exists).
 */
import { LOCALES } from "@/i18n/locales";

/** Top-level sections that are counted, as they appear in the URL after the locale. */
export const COUNTED_SECTIONS = new Set([
  "",
  "about",
  "add-listing",
  "best-places",
  "bucket-list",
  "challenge",
  "explore",
  "foreign-tour",
  "gallery",
  "kind",
  "listing",
  "listings",
  "login",
  "month",
  "my-bangladesh",
  "my-listings",
  "near-me",
  "photo",
  "place",
  "district",
  "plan",
  "play",
  "post",
  "privacy",
  "profile",
  "quiz",
  "register",
  "restaurants",
  "route",
  "routes",
  "safety",
  "search",
  "shopping",
  "stay",
  "suggest",
  "train",
  "trains",
  "trip",
  "trip-cost",
  "u",
  "unseen",
  "upload",
  "world",
]);

/** Sections whose second segment is a slug: counted as a pattern (and, for two, by slug too). */
const SLUGGED = new Set([
  "district",
  "kind",
  "listing",
  "month",
  "photo",
  "place",
  "post",
  "quiz",
  "route",
  "train",
  "trip",
  "u",
]);
/** Sections where the slug is also kept (their slugs are checked against the data). */
export const SLUG_KEPT = new Set(["place", "district"]);

const SLUG = /^[\p{L}\p{N}_-]{1,80}$/u;

export type VisitPath = { pattern: string; section: string; slug: string | null };

/**
 * The counter names for a page path (locale prefix allowed), or null when the page is not
 * counted (API, admin, unknown sections, junk).
 */
export function visitPath(raw: unknown): VisitPath | null {
  if (typeof raw !== "string" || raw.length > 200 || !raw.startsWith("/")) return null;
  let path = raw.split(/[?#]/)[0]!;
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  const parts = path.split("/").filter(Boolean);
  if (parts.length && (LOCALES as readonly string[]).includes(parts[0]!)) parts.shift();
  const section = parts[0] ?? "";
  if (!COUNTED_SECTIONS.has(section) || parts.length > 2) return null;
  if (parts.length === 2) {
    if (!SLUGGED.has(section) || !SLUG.test(parts[1]!)) return null;
    return { pattern: `/${section}/[slug]`, section, slug: parts[1]! };
  }
  if (SLUGGED.has(section) && section !== "quiz") return null; // `/place` alone is not a page
  return { pattern: `/${section}`, section, slug: null };
}
