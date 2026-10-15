import { asc, desc, eq } from "drizzle-orm";
import { LEVEL_BADGES, type Level } from "@/lib/visited/levels";
import { getDb } from "../db/client";
import { districts, places, reference } from "../db/schema";
import { pick, type Lang } from "./lang";

type LevelRow = { min_districts?: unknown; title_bn?: unknown; title_en?: unknown };

const FALLBACK: LevelRow[] = [
  { min_districts: 10, title_en: "Bangladesh Explorer" },
  { min_districts: 25, title_en: "Bangladesh Traveller" },
  { min_districts: 40, title_en: "Bangladesh Adventurer" },
  { min_districts: 50, title_en: "Bangladesh Master" },
  { min_districts: 64, title_en: "Bangladesh Legend" },
];

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/** The five My Bangladesh levels (from `reference.json`), lowest first, with their badges. */
export async function getMyBangladeshLevels(lang: Lang = "bn"): Promise<Level[]> {
  const row = getDb()
    .select()
    .from(reference)
    .where(eq(reference.key, "my_bangladesh_levels"))
    .get();
  const rows = Array.isArray(row?.value) && row.value.length ? (row.value as LevelRow[]) : FALLBACK;
  return rows
    .filter((r) => typeof r.min_districts === "number")
    .sort((a, b) => (a.min_districts as number) - (b.min_districts as number))
    .map((r, i) => ({
      min: r.min_districts as number,
      title: pick(lang, text(r.title_bn), text(r.title_en)) ?? "",
      badge: LEVEL_BADGES[Math.min(i, LEVEL_BADGES.length - 1)]!,
    }));
}

/**
 * One place cover per district (the most popular, best-rated place there), keyed by district
 * slug, for the card maker's "district photos". Values are public `w640` WebP URLs.
 */
export async function getDistrictCovers(): Promise<Record<string, string>> {
  const rows = getDb()
    .select({ district: districts.slug, slug: places.slug, cover: places.cover })
    .from(places)
    .innerJoin(districts, eq(districts.id, places.districtId))
    .orderBy(asc(places.districtId), desc(places.popular), desc(places.stars), asc(places.id))
    .all();
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (out[r.district]) continue;
    out[r.district] = r.cover?.w640 ?? `/places/w640/${r.slug}.webp`;
  }
  return out;
}
