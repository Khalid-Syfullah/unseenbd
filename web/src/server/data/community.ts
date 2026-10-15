import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { prepareQuery, scoreAny } from "@/lib/search";
import { getDb } from "../db/client";
import {
  districts,
  listings,
  photoComments,
  photos,
  places,
  postComments,
  posts,
  suggestions,
  trendComments,
  users,
} from "../db/schema";
import { nameIn } from "./shared";
import type { Lang } from "./lang";
import type { CommunityListing, CommunityPhoto, CommunityPost, CommunitySuggestion } from "./types";

/*
 * Community content that visitors submit and a moderator approves. These tables start empty,
 * so every list can legitimately be empty and pages show an empty state. Only approved (and, for
 * photos, public) items are ever returned here, except where a function says otherwise.
 */

type PhotoRow = {
  p: typeof photos.$inferSelect;
  d: typeof districts.$inferSelect;
  pl: typeof places.$inferSelect | null;
};

function toPhoto({ p, d, pl }: PhotoRow, lang: Lang): CommunityPhoto {
  return {
    id: p.id,
    src: p.src,
    thumb: p.thumb,
    width: p.width ?? 800,
    height: p.height ?? 600,
    uploader: p.uploaderName,
    caption: p.caption,
    district: { slug: d.slug, name: nameIn(lang, d) },
    place: pl ? { slug: pl.slug, name: nameIn(lang, pl) } : null,
    likes: p.likes,
    createdAt: p.createdAt,
  };
}

const PUBLIC_PHOTO = () => and(eq(photos.status, "approved"), eq(photos.isPublic, true));

function photoQuery(where?: SQL) {
  return getDb()
    .select({ p: photos, d: districts, pl: places })
    .from(photos)
    .innerJoin(districts, eq(photos.districtId, districts.id))
    .leftJoin(places, eq(photos.placeId, places.id))
    .where(and(PUBLIC_PHOTO(), where))
    .orderBy(desc(photos.createdAt), desc(photos.id));
}

function approvedPhotos(lang: Lang, limit: number, where?: SQL): CommunityPhoto[] {
  return photoQuery(where)
    .limit(limit)
    .all()
    .map((r) => toPhoto(r, lang));
}

/** Latest approved, public traveller photos, newest first. */
export async function listLatestPhotos(lang: Lang = "bn", limit = 12): Promise<CommunityPhoto[]> {
  return approvedPhotos(lang, limit);
}

/** Approved traveller photos of one place, newest first. */
export async function listPlacePhotos(
  placeId: number,
  lang: Lang = "bn",
  limit = 12,
): Promise<CommunityPhoto[]> {
  return approvedPhotos(lang, limit, eq(photos.placeId, placeId));
}

/** Approved traveller photos of one district, newest first. */
export async function listDistrictPhotos(
  districtId: number,
  lang: Lang = "bn",
  limit = 6,
): Promise<CommunityPhoto[]> {
  return approvedPhotos(lang, limit, eq(photos.districtId, districtId));
}

export const GALLERY_PAGE_SIZE = 24;

export type GalleryPage = {
  items: CommunityPhoto[];
  total: number;
  page: number;
  pageCount: number;
  /** Approved photos per district slug (all of them, ignoring the filters), for the map. */
  byDistrict: Record<string, number>;
};

/**
 * The gallery: approved public photos, newest first, optionally of one district and matching a
 * search over the caption (area), the place and the district names in both languages.
 */
export async function listGallery({
  district,
  q,
  page = 1,
  pageSize = GALLERY_PAGE_SIZE,
  lang = "bn",
}: {
  district?: string | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
  lang?: Lang;
} = {}): Promise<GalleryPage> {
  const all = photoQuery().all();
  const byDistrict: Record<string, number> = {};
  for (const r of all) byDistrict[r.d.slug] = (byDistrict[r.d.slug] ?? 0) + 1;

  let rows = district ? all.filter((r) => r.d.slug === district) : all;
  const query = prepareQuery((q ?? "").trim().slice(0, 100));
  if (query.fold) {
    rows = rows.filter(
      (r) =>
        scoreAny(query, [r.p.caption], false) > 0 ||
        scoreAny(query, [r.d.nameBn, r.d.nameEn, r.pl?.nameBn, r.pl?.nameEn]) > 0,
    );
  }
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: rows.slice((current - 1) * pageSize, current * pageSize).map((r) => toPhoto(r, lang)),
    total,
    page: current,
    pageCount,
    byDistrict,
  };
}

/** One approved, public photo with its comment count, or null. */
export async function getPhoto(
  id: number,
  lang: Lang = "bn",
): Promise<(CommunityPhoto & { comments: number }) | null> {
  const row = photoQuery(eq(photos.id, id)).get();
  if (!row) return null;
  const comments =
    getDb()
      .select({ n: count() })
      .from(photoComments)
      .where(and(eq(photoComments.photoId, id), eq(photoComments.status, "visible")))
      .get()?.n ?? 0;
  return { ...toPhoto(row, lang), comments };
}

export type CommunityComment = { id: number; name: string; body: string; createdAt: string };

/** Approved comments on a photo, oldest first. */
export async function listPhotoComments(photoId: number, limit = 200): Promise<CommunityComment[]> {
  return getDb()
    .select({
      id: photoComments.id,
      name: photoComments.name,
      body: photoComments.body,
      createdAt: photoComments.createdAt,
    })
    .from(photoComments)
    .where(and(eq(photoComments.photoId, photoId), eq(photoComments.status, "visible")))
    .orderBy(asc(photoComments.createdAt), asc(photoComments.id))
    .limit(limit)
    .all();
}

/** Approved owner listings (stays, restaurants, home food, products) of one district. */
export async function listDistrictListings(
  districtId: number,
  limit = 12,
): Promise<CommunityListing[]> {
  const db = getDb();
  return db
    .select()
    .from(listings)
    .where(and(eq(listings.status, "approved"), eq(listings.districtId, districtId)))
    .orderBy(desc(listings.sponsored), desc(listings.createdAt), desc(listings.id))
    .limit(limit)
    .all()
    .map((l) => ({
      id: l.id,
      kind: l.kind,
      category: l.category,
      name: l.name,
      area: l.area,
      description: l.description,
      phone: l.phone,
      sponsored: l.sponsored,
    }));
}

/* -- posts ---------------------------------------------------------------------------------- */

function selectPosts(where: SQL | undefined) {
  return getDb()
    .select({ p: posts, u: users, d: districts })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(districts, eq(posts.districtId, districts.id))
    .where(where)
    .orderBy(desc(posts.createdAt), desc(posts.id));
}

type PostRow = ReturnType<ReturnType<typeof selectPosts>["all"]>[number];

function toPosts(rows: PostRow[], lang: Lang): CommunityPost[] {
  const db = getDb();
  const commentCounts = new Map(
    rows.length
      ? db
          .select({ postId: postComments.postId, n: count() })
          .from(postComments)
          .where(
            and(
              inArray(
                postComments.postId,
                rows.map((r) => r.p.id),
              ),
              eq(postComments.status, "visible"),
            ),
          )
          .groupBy(postComments.postId)
          .all()
          .map((r) => [r.postId, r.n])
      : [],
  );
  return rows.map(({ p, u, d }) => ({
    id: p.id,
    author: u.name,
    authorHandle: u.handle,
    body: p.body,
    photos: Array.isArray(p.photos) ? p.photos.filter((x) => x && typeof x.src === "string") : [],
    district: d ? { slug: d.slug, name: nameIn(lang, d) } : null,
    likes: p.likes,
    comments: commentCounts.get(p.id) ?? 0,
    /** Mean rating on the 0–1000 editorial scale, or null when nobody rated it. */
    stars: p.ratingCount > 0 ? Math.round((p.ratingSum / p.ratingCount) * 100) : null,
    ratings: p.ratingCount,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

/** Latest approved traveller posts, newest first. */
export async function listLatestPosts(limit = 24, lang: Lang = "bn"): Promise<CommunityPost[]> {
  const rows = selectPosts(eq(posts.status, "approved")).limit(limit).all();
  return toPosts(rows, lang);
}

export const POSTS_PAGE_SIZE = 12;

/** A page of approved posts, optionally matching `q` in the text. */
export async function listPostsPage({
  page = 1,
  pageSize = POSTS_PAGE_SIZE,
  q,
  lang = "bn",
}: { page?: number; pageSize?: number; q?: string | null; lang?: Lang } = {}): Promise<{
  items: CommunityPost[];
  total: number;
  page: number;
  pageCount: number;
}> {
  let rows = selectPosts(eq(posts.status, "approved")).all();
  const query = prepareQuery((q ?? "").trim().slice(0, 100));
  if (query.fold) rows = rows.filter((r) => scoreAny(query, [r.p.body], false) > 0);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: toPosts(rows.slice((current - 1) * pageSize, current * pageSize), lang),
    total,
    page: current,
    pageCount,
  };
}

/** One post: approved ones for everybody, the author's own in any state. */
export async function getPost(
  id: number,
  lang: Lang = "bn",
  viewerId: number | null = null,
): Promise<CommunityPost | null> {
  const row = selectPosts(eq(posts.id, id)).get();
  if (!row) return null;
  if (row.p.status !== "approved" && row.p.userId !== viewerId) return null;
  return toPosts([row], lang)[0]!;
}

/** A user's posts: all of them for the author (with status), approved ones for others. */
export async function listUserPosts(
  userId: number,
  { approvedOnly = false, lang = "bn" }: { approvedOnly?: boolean; lang?: Lang } = {},
): Promise<CommunityPost[]> {
  const where = approvedOnly
    ? and(eq(posts.userId, userId), eq(posts.status, "approved"))
    : eq(posts.userId, userId);
  return toPosts(selectPosts(where).limit(100).all(), lang);
}

/** Approved comments on a post, oldest first. */
export async function listPostComments(postId: number, limit = 200): Promise<CommunityComment[]> {
  return getDb()
    .select({
      id: postComments.id,
      name: users.name,
      body: postComments.body,
      createdAt: postComments.createdAt,
    })
    .from(postComments)
    .innerJoin(users, eq(postComments.userId, users.id))
    .where(and(eq(postComments.postId, postId), eq(postComments.status, "visible")))
    .orderBy(asc(postComments.createdAt), asc(postComments.id))
    .limit(limit)
    .all();
}

/* -- suggestions and trending comments ------------------------------------------------------ */

/** Approved visitor suggestions (places, foods, products), newest first. */
export async function listApprovedSuggestions(
  lang: Lang = "bn",
  limit = 10,
  offset = 0,
): Promise<CommunitySuggestion[]> {
  const db = getDb();
  return db
    .select({ s: suggestions, d: districts })
    .from(suggestions)
    .leftJoin(districts, eq(suggestions.districtId, districts.id))
    .where(eq(suggestions.status, "approved"))
    .orderBy(desc(suggestions.createdAt), desc(suggestions.id))
    .limit(limit)
    .offset(offset)
    .all()
    .map(({ s, d }) => ({
      id: s.id,
      kind: s.kind,
      name: s.name,
      body: s.body,
      district: d ? { slug: d.slug, name: nameIn(lang, d) } : null,
      likes: s.likes,
      votes: s.votes,
      stars: s.ratingCount > 0 ? Math.round((s.ratingSum / s.ratingCount) * 100) : null,
    }));
}

export async function countApprovedSuggestions(): Promise<number> {
  return (
    getDb().select({ n: count() }).from(suggestions).where(eq(suggestions.status, "approved")).get()
      ?.n ?? 0
  );
}

/** Approved trending comments on a place, newest first. */
export async function listTrendComments(placeId: number, limit = 30): Promise<CommunityComment[]> {
  return getDb()
    .select({
      id: trendComments.id,
      name: trendComments.name,
      body: trendComments.body,
      createdAt: trendComments.createdAt,
    })
    .from(trendComments)
    .where(and(eq(trendComments.placeId, placeId), eq(trendComments.status, "visible")))
    .orderBy(desc(trendComments.createdAt), desc(trendComments.id))
    .limit(limit)
    .all();
}
