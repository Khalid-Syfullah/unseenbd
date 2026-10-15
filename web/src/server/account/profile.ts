/**
 * What the profile pages show: the signed-in summary and tabs (`/profile`), and the public
 * profile (`/u/:handle`), which only ever shows things that are public: shareable trips, approved
 * public photos, approved posts and, if the user switched it on, the visited map.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { districts, photos, places, posts, wishlist } from "../db/schema";
import type { Lang } from "../data/lang";
import { getUserByHandle } from "../auth/users";
import { getVisited, getWorldOf } from "./sync";
import { listTrips, tripTotals, type TripSummary } from "./trips";

export type ProfileSummary = {
  visited: number[];
  trips: number;
  photos: number;
  posts: number;
  /** Sum of the saved trips' totals, ৳. */
  totalSpend: number;
  want: number;
};

export function getSummary(userId: number): ProfileSummary {
  const db = getDb();
  const { count, spend } = tripTotals(userId);
  const photoCount =
    db
      .select({ n: sql<number>`count(*)` })
      .from(photos)
      .where(eq(photos.userId, userId))
      .get()?.n ?? 0;
  const postCount =
    db
      .select({ n: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.userId, userId))
      .get()?.n ?? 0;
  const want =
    db
      .select({ n: sql<number>`count(*)` })
      .from(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.status, "want")))
      .get()?.n ?? 0;
  return {
    visited: getVisited(userId),
    trips: count,
    photos: photoCount,
    posts: postCount,
    totalSpend: spend,
    want,
  };
}

export type MyPhoto = {
  id: number;
  src: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  isPublic: boolean;
  district: { slug: string; name: string };
  createdAt: string;
};

export function listMyPhotos(
  userId: number,
  lang: Lang,
  { approvedPublicOnly = false } = {},
): MyPhoto[] {
  const where = approvedPublicOnly
    ? and(eq(photos.userId, userId), eq(photos.status, "approved"), eq(photos.isPublic, true))
    : eq(photos.userId, userId);
  return getDb()
    .select({
      id: photos.id,
      src: photos.src,
      width: photos.width,
      height: photos.height,
      caption: photos.caption,
      status: photos.status,
      isPublic: photos.isPublic,
      slug: districts.slug,
      nameBn: districts.nameBn,
      nameEn: districts.nameEn,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .innerJoin(districts, eq(districts.id, photos.districtId))
    .where(where)
    .orderBy(desc(photos.createdAt), desc(photos.id))
    .limit(200)
    .all()
    .map((r) => ({
      id: r.id,
      src: r.src,
      width: r.width,
      height: r.height,
      caption: r.caption,
      status: r.status,
      isPublic: r.isPublic,
      district: { slug: r.slug, name: lang === "bn" ? r.nameBn : r.nameEn },
      createdAt: r.createdAt,
    }));
}

/** Deletes every photo the user uploaded (rows; comments go with them). Returns the count. */
export function deleteMyPhotos(userId: number): number {
  return getDb().delete(photos).where(eq(photos.userId, userId)).run().changes;
}

export type MyPost = {
  id: number;
  body: string;
  photos: string[];
  status: "pending" | "approved" | "rejected";
  likes: number;
  createdAt: string;
};

export function listMyPosts(userId: number, { approvedOnly = false } = {}): MyPost[] {
  const where = approvedOnly
    ? and(eq(posts.userId, userId), eq(posts.status, "approved"))
    : eq(posts.userId, userId);
  return getDb()
    .select({
      id: posts.id,
      body: posts.body,
      photos: posts.photos,
      status: posts.status,
      likes: posts.likes,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(100)
    .all()
    .map((r) => ({ ...r, photos: Array.isArray(r.photos) ? r.photos : [] }));
}

export type WantPlace = {
  slug: string;
  name: string;
  district: string;
  kind: string;
};

/** Places marked "want to see" in the bucket list, plus "want to go" countries. */
export function listWantToGo(
  userId: number,
  lang: Lang,
): { places: WantPlace[]; countries: string[] } {
  const rows = getDb()
    .select({
      slug: places.slug,
      nameBn: places.nameBn,
      nameEn: places.nameEn,
      kind: places.kind,
      dBn: districts.nameBn,
      dEn: districts.nameEn,
    })
    .from(wishlist)
    .innerJoin(places, eq(places.id, wishlist.placeId))
    .innerJoin(districts, eq(districts.id, places.districtId))
    .where(and(eq(wishlist.userId, userId), eq(wishlist.status, "want")))
    .orderBy(desc(wishlist.createdAt))
    .all();
  const world = getWorldOf(userId);
  return {
    places: rows.map((r) => ({
      slug: r.slug,
      name: lang === "bn" ? r.nameBn : r.nameEn,
      district: lang === "bn" ? r.dBn : r.dEn,
      kind: r.kind,
    })),
    countries: Object.entries(world)
      .filter(([, mark]) => mark === "wish")
      .map(([key]) => key)
      .sort(),
  };
}

export type PublicProfile = {
  name: string;
  handle: string;
  createdAt: string;
  /** Only when the user chose to show their map. */
  visited: number[] | null;
  trips: TripSummary[];
  photos: MyPhoto[];
  posts: MyPost[];
};

export function getPublicProfile(handle: string, lang: Lang): PublicProfile | null {
  const user = getUserByHandle(handle);
  if (!user) return null;
  return {
    name: user.name,
    handle: user.handle,
    createdAt: user.createdAt,
    visited: user.publicMap ? getVisited(user.id) : null,
    trips: listTrips(user.id, { publicOnly: true }),
    photos: listMyPhotos(user.id, lang, { approvedPublicOnly: true }),
    posts: listMyPosts(user.id, { approvedOnly: true }),
  };
}
