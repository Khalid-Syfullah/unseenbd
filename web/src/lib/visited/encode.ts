/**
 * Share links (FEATURES.md §5.2): the link carries only the districts (or countries) and an
 * optional display name, nothing else.
 *
 * - Districts: a 64-bit set (bit `id − 1`), trailing zero bytes dropped, in base64url. All 64
 *   districts are 11 characters: `/my-bangladesh?v=__________8&n=Rahim`.
 * - Countries: ISO2 codes run together (`BDINNP`), visited in `v`, want-to-go in `w`.
 *
 * Pure functions: safe on the server and in the browser.
 */
import { localePath, type Locale } from "@/i18n/locales";
import { cleanDistrictIds, TOTAL_DISTRICTS } from "./districts";

const BYTES = Math.ceil(TOTAL_DISTRICTS / 8);
/** Longest `v=` value for districts. */
export const MAX_DISTRICT_CODE = Math.ceil((BYTES * 4) / 3);

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** District ids → the compact `v=` value (empty for none). */
export function encodeDistrictIds(ids: Iterable<number>): string {
  const bytes = new Uint8Array(BYTES);
  for (const id of cleanDistrictIds(ids)) bytes[(id - 1) >> 3] |= 1 << ((id - 1) & 7);
  let end = BYTES;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  return end ? toBase64Url(bytes.subarray(0, end)) : "";
}

/** The `v=` value → district ids (ascending). Anything malformed gives an empty list. */
export function decodeDistrictIds(code: string | null | undefined): number[] {
  if (!code || code.length > MAX_DISTRICT_CODE) return [];
  const bytes = fromBase64Url(code.trim());
  if (!bytes) return [];
  const ids: number[] = [];
  bytes.forEach((byte, i) => {
    for (let bit = 0; bit < 8; bit += 1) if (byte & (1 << bit)) ids.push(i * 8 + bit + 1);
  });
  return cleanDistrictIds(ids);
}

/** ISO2 codes → `BDINNP` (sorted, unique; anything that is not ISO2 is left out). */
export function encodeCountries(keys: Iterable<string>): string {
  return [...new Set([...keys].filter((k) => /^[A-Z]{2}$/.test(k)))].sort().join("");
}

/** `BDINNP` → `["BD", "IN", "NP"]`, keeping only codes in `known` when it is given. */
export function decodeCountries(code: string | null | undefined, known?: Set<string>): string[] {
  if (!code || code.length > 600) return [];
  const text = code.trim().toUpperCase();
  if (!/^(?:[A-Z]{2})+$/.test(text)) return [];
  const out = new Set<string>();
  for (let i = 0; i < text.length; i += 2) {
    const key = text.slice(i, i + 2);
    if (!known || known.has(key)) out.add(key);
  }
  return [...out].sort();
}

/** Longest display name a share link carries. */
export const MAX_NAME_LENGTH = 40;

/**
 * A display name safe to put in a link and on a page: no control characters or angle brackets,
 * single spaces, at most 40 characters.
 */
export function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim();
  return [...cleaned].slice(0, MAX_NAME_LENGTH).join("").trim();
}

function query(params: Record<string, string>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** `/my-bangladesh?v=…&n=…` in `locale`: the read-only view of someone's districts. */
export function myBangladeshSharePath(locale: Locale, ids: Iterable<number>, name = ""): string {
  return (
    localePath(locale, "/my-bangladesh") + query({ v: encodeDistrictIds(ids), n: cleanName(name) })
  );
}

/** `/challenge?c=…&n=…` in `locale`: "can you beat my count?". */
export function challengePath(locale: Locale, ids: Iterable<number>, name = ""): string {
  return (
    localePath(locale, "/challenge") + query({ c: encodeDistrictIds(ids), n: cleanName(name) })
  );
}

/** `/world?v=…&w=…&n=…` in `locale`: the read-only view of someone's world map. */
export function worldSharePath(
  locale: Locale,
  marks: Readonly<Record<string, "visited" | "wish">>,
  name = "",
): string {
  const visited = Object.keys(marks).filter((k) => marks[k] === "visited");
  const wish = Object.keys(marks).filter((k) => marks[k] === "wish");
  return (
    localePath(locale, "/world") +
    query({ v: encodeCountries(visited), w: encodeCountries(wish), n: cleanName(name) })
  );
}

export type QueryLike = URLSearchParams | Record<string, string | string[] | undefined>;

export function queryValue(q: QueryLike, key: string): string | null {
  if (q instanceof URLSearchParams) return q.get(key);
  const v = q[key];
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

/** A shared district list from `?v=` (or `?c=` for challenges) and `?n=`; null when absent. */
export function parseDistrictShare(
  q: QueryLike,
  key: "v" | "c" = "v",
): { ids: number[]; name: string } | null {
  const code = queryValue(q, key);
  if (code === null) return null;
  return { ids: decodeDistrictIds(code), name: cleanName(queryValue(q, "n")) };
}

/** A shared world map from `?v=`, `?w=` and `?n=`; null when neither list is in the URL. */
export function parseWorldShare(
  q: QueryLike,
  known?: Set<string>,
): { visited: string[]; wish: string[]; name: string } | null {
  const v = queryValue(q, "v");
  const w = queryValue(q, "w");
  if (v === null && w === null) return null;
  const visited = decodeCountries(v, known);
  const seen = new Set(visited);
  const wish = decodeCountries(w, known).filter((k) => !seen.has(k));
  return { visited, wish, name: cleanName(queryValue(q, "n")) };
}
