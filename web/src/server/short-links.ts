/**
 * Short share links (FEATURES.md §5.2): a 6-character code that stands for a My Bangladesh share
 * link. The server stores only the district ids and the optional display name, nothing about who
 * made it. The same districts and name always get the same code.
 */
import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { cleanDistrictIds } from "@/lib/visited/districts";
import { cleanName } from "@/lib/visited/encode";
import { getDb } from "./db/client";
import { shortLinks } from "./db/schema";
import { createRateLimiter } from "./rate-limit";

/** No 0/O, 1/l/I: codes are read aloud and typed. */
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;

export function isShortCode(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`).test(value);
}

function newCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** `POST /api/share`: 20 new links per IP per hour. */
export const SHORT_LINK_LIMIT = 20;
export const shortLinkLimiter = createRateLimiter({
  limit: SHORT_LINK_LIMIT,
  windowMs: 60 * 60 * 1000,
});

export type ShortLink = { code: string; ids: number[]; name: string };

/** Stores `{ids, name}` (cleaned) and returns its code. */
export function createShortLink(ids: Iterable<number>, name: string): ShortLink {
  const db = getDb();
  const cleanIds = cleanDistrictIds(ids);
  const cleanedName = cleanName(name);
  const storedName = cleanedName || null;

  const existing = db
    .select({ code: shortLinks.code })
    .from(shortLinks)
    .where(
      and(
        eq(shortLinks.districtIds, cleanIds),
        storedName === null ? isNull(shortLinks.name) : eq(shortLinks.name, storedName),
      ),
    )
    .get();
  if (existing) return { code: existing.code, ids: cleanIds, name: cleanedName };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = newCode();
    const inserted = db
      .insert(shortLinks)
      .values({ code, districtIds: cleanIds, name: storedName })
      .onConflictDoNothing()
      .run();
    if (inserted.changes === 1) return { code, ids: cleanIds, name: cleanedName };
  }
  throw new Error("could not allocate a short-link code");
}

/** The stored link for `code`, or null. */
export function getShortLink(code: string): ShortLink | null {
  if (!isShortCode(code)) return null;
  const row = getDb().select().from(shortLinks).where(eq(shortLinks.code, code)).get();
  if (!row) return null;
  return {
    code: row.code,
    ids: cleanDistrictIds(Array.isArray(row.districtIds) ? row.districtIds : []),
    name: cleanName(row.name ?? ""),
  };
}
