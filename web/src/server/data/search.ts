import { prepareQuery, scoreAny, type MatchScore } from "@/lib/search";
import { getDb } from "../db/client";
import { districts, places } from "../db/schema";
import { eq } from "drizzle-orm";
import { listLatestPhotos, listLatestPosts } from "./community";
import { listDistricts } from "./districts";
import type { Lang } from "./lang";
import { allPlaces } from "./places";
import type {
  CommunityPhoto,
  CommunityPost,
  DistrictListItem,
  PlaceSummary,
  SearchResults,
} from "./types";

/** Longest query we look at. */
export const MAX_QUERY_LENGTH = 100;

export function cleanQuery(q: string | null | undefined): string {
  return (q ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

function ranked<T>(items: T[], score: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index, s: score(item) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .map((x) => x.item);
}

/** Name matches outrank matches on the district a place is in. */
function placeScore(q: ReturnType<typeof prepareQuery>, row: PlaceNames): number {
  const name = scoreAny(q, [row.nameBn, row.nameEn, row.slug.replace(/-/g, " ")]);
  const district = scoreAny(q, [row.districtBn, row.districtEn]);
  return Math.max(name * 2, district) as MatchScore;
}

type PlaceNames = {
  nameBn: string;
  nameEn: string;
  slug: string;
  districtBn: string;
  districtEn: string;
};

/**
 * Ids of the places whose name (Bengali or English, any case or accent, Latin spelling of a
 * Bengali name) or district matches `q`. Explore adds these to its own text filter.
 */
export function matchPlaceIds(q: string): number[] {
  const query = prepareQuery(cleanQuery(q));
  if (!query.fold) return [];
  const rows = getDb()
    .select({
      id: places.id,
      nameBn: places.nameBn,
      nameEn: places.nameEn,
      slug: places.slug,
      districtBn: districts.nameBn,
      districtEn: districts.nameEn,
    })
    .from(places)
    .innerJoin(districts, eq(places.districtId, districts.id))
    .all();
  return rows.filter((r) => placeScore(query, r) > 0).map((r) => r.id);
}

export type SearchLimits = { places?: number; photos?: number; posts?: number };

const DEFAULTS = { places: 48, photos: 24, posts: 12 };

/**
 * One query across districts, places, photos and posts. Names match in Bengali and English
 * without regard to case or accents, and Latin spellings find Bengali names ("sajek" finds
 * "সাজেক"). Photos and posts match on their text and district. `total*` fields count every match;
 * the lists are cut to the limits.
 */
export async function searchAll(
  raw: string | null | undefined,
  lang: Lang = "bn",
  limits: SearchLimits = {},
): Promise<SearchResults> {
  const q = cleanQuery(raw);
  const limit = { ...DEFAULTS, ...limits };
  const empty: SearchResults = {
    query: q,
    districts: [],
    places: [],
    photos: [],
    posts: [],
    totalPlaces: 0,
    totalPhotos: 0,
    totalPosts: 0,
  };
  const query = prepareQuery(q);
  if (!query.fold) return empty;

  const [allDistricts, allPlacesList, allPhotos, allPosts] = await Promise.all([
    listDistricts(lang),
    allPlaces({ lang }),
    listLatestPhotos(lang, 1000),
    listLatestPosts(1000),
  ]);

  const matchedDistricts: DistrictListItem[] = ranked(allDistricts, (d) =>
    scoreAny(query, [d.nameBn, d.nameEn, d.slug.replace(/-/g, " ")]),
  );
  const matchedPlaces: PlaceSummary[] = ranked(allPlacesList, (p) =>
    placeScore(query, {
      nameBn: p.nameBn,
      nameEn: p.nameEn,
      slug: p.slug,
      districtBn: p.district.nameBn,
      districtEn: p.district.nameEn,
    }),
  );

  const districtNames = new Map(allDistricts.map((d) => [d.slug, d]));
  const matchedPhotos: CommunityPhoto[] = ranked(allPhotos, (p) => {
    const d = districtNames.get(p.district.slug);
    return Math.max(
      scoreAny(query, [p.caption], false) * 2,
      scoreAny(query, [d?.nameBn, d?.nameEn]),
    );
  });
  const matchedPosts: CommunityPost[] = ranked(allPosts, (p) => scoreAny(query, [p.body], false));

  return {
    query: q,
    districts: matchedDistricts,
    places: matchedPlaces.slice(0, limit.places),
    photos: matchedPhotos.slice(0, limit.photos),
    posts: matchedPosts.slice(0, limit.posts),
    totalPlaces: matchedPlaces.length,
    totalPhotos: matchedPhotos.length,
    totalPosts: matchedPosts.length,
  };
}
