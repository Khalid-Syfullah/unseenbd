import { asc } from "drizzle-orm";
import { famousKey } from "@/lib/games/builders";
import { STYLE_KINDS, TRAVEL_STYLES, type TravelStyle } from "@/lib/games/personality";
import type { GameData, GameLabels } from "@/lib/games/types";
import { getDb } from "../db/client";
import { districts, divisions } from "../db/schema";
import type { Lang } from "./lang";
import { allPlaces } from "./places";
import { nameIn } from "./shared";
import type { PlaceSummary } from "./types";

let cachedData: GameData | null = null;

/**
 * What the question builders need: districts (id, division, centroid, "famous for" keys) and the
 * division slugs. Language-free, so the server re-scores with exactly the rounds the browser
 * played. Seeded content never changes while the server runs, so it is built once.
 */
export function getGameDataSync(): GameData {
  if (cachedData) return cachedData;
  const db = getDb();
  const rows = db.select().from(districts).orderBy(asc(districts.id)).all();
  const divs = db.select({ slug: divisions.slug }).from(divisions).all();
  cachedData = {
    districts: rows.map((d) => ({
      id: d.id,
      slug: d.slug,
      division: d.division,
      lat: d.lat,
      lng: d.lng,
      famous: d.famousForEn.map(famousKey),
    })),
    divisions: divs.map((d) => d.slug).sort(),
  };
  return cachedData;
}

/** Builder data plus display names in `lang`. */
export async function getGameData(
  lang: Lang = "bn",
): Promise<{ data: GameData; labels: GameLabels }> {
  const db = getDb();
  const rows = db.select().from(districts).orderBy(asc(districts.id)).all();
  const divs = db.select().from(divisions).all();
  const labels: GameLabels = {
    districts: Object.fromEntries(rows.map((d) => [d.id, nameIn(lang, d)])),
    divisions: Object.fromEntries(divs.map((d) => [d.slug, nameIn(lang, d)])),
    famous: Object.fromEntries(
      rows.map((d) => {
        const en = d.famousForEn;
        const bn = d.famousForBn.length === en.length ? d.famousForBn : en;
        return [d.id, lang === "bn" ? bn : en];
      }),
    ),
  };
  return { data: getGameDataSync(), labels };
}

/** Places offered per style in the personality quiz. */
const PER_STYLE = 12;

export type PersonalityPlace = Pick<
  PlaceSummary,
  "slug" | "name" | "district" | "kind" | "bestFromMonth" | "bestToMonth" | "cover" | "description"
>;

/**
 * For the personality quiz: the best places of each travel style (popular first, then by
 * editorial stars), keyed by slug, and the slug lists per style.
 */
export async function getPersonalityData(lang: Lang = "bn"): Promise<{
  places: Record<string, PersonalityPlace>;
  pools: Record<TravelStyle, string[]>;
}> {
  const all = await allPlaces({ lang });
  const ranked = [...all].sort(
    (a, b) => Number(b.popular) - Number(a.popular) || b.stars - a.stars || a.id - b.id,
  );
  const places: Record<string, PersonalityPlace> = {};
  const pools = {} as Record<TravelStyle, string[]>;
  for (const style of TRAVEL_STYLES) {
    const chosen = ranked
      .filter((p) => STYLE_KINDS[style].includes(p.kind.key))
      .slice(0, PER_STYLE);
    pools[style] = chosen.map((p) => p.slug);
    for (const p of chosen) {
      places[p.slug] = {
        slug: p.slug,
        name: p.name,
        district: p.district,
        kind: p.kind,
        bestFromMonth: p.bestFromMonth,
        bestToMonth: p.bestToMonth,
        cover: p.cover,
        description: p.description,
      };
    }
  }
  return { places, pools };
}
