import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { districts, listings, photos, postComments, posts, suggestions, users } from "../db/schema";
import { nameIn } from "./shared";
import type { Lang } from "./lang";
import type { CommunityListing, CommunityPhoto, CommunityPost, CommunitySuggestion } from "./types";

/*
 * Community content that visitors submit and a moderator approves. These tables start empty,
 * so every list can legitimately be empty and pages show an empty state.
 */

function approvedPhotos(lang: Lang, limit: number, where?: SQL): CommunityPhoto[] {
  const db = getDb();
  return db
    .select({ p: photos, d: districts })
    .from(photos)
    .innerJoin(districts, eq(photos.districtId, districts.id))
    .where(and(eq(photos.status, "approved"), eq(photos.isPublic, true), where))
    .orderBy(desc(photos.createdAt), desc(photos.id))
    .limit(limit)
    .all()
    .map(({ p, d }) => ({
      id: p.id,
      src: p.src,
      width: p.width ?? 800,
      height: p.height ?? 600,
      uploader: p.uploaderName,
      caption: p.caption,
      district: { slug: d.slug, name: nameIn(lang, d) },
      likes: p.likes,
      createdAt: p.createdAt,
    }));
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

/** Latest approved traveller posts, newest first. */
export async function listLatestPosts(limit = 24): Promise<CommunityPost[]> {
  const db = getDb();
  const rows = db
    .select({ p: posts, u: users })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.status, "approved"))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit)
    .all();
  const commentCounts = new Map(
    rows.length
      ? db
          .select({ postId: postComments.postId, n: count() })
          .from(postComments)
          .where(
            inArray(
              postComments.postId,
              rows.map((r) => r.p.id),
            ),
          )
          .groupBy(postComments.postId)
          .all()
          .map((r) => [r.postId, r.n])
      : [],
  );
  return rows.map(({ p, u }) => ({
    id: p.id,
    author: u.name,
    body: p.body,
    photos: p.photos ?? [],
    likes: p.likes,
    comments: commentCounts.get(p.id) ?? 0,
    /** Mean rating on the 0–1000 editorial scale, or null when nobody rated it. */
    stars: p.ratingCount > 0 ? Math.round((p.ratingSum / p.ratingCount) * 100) : null,
    createdAt: p.createdAt,
  }));
}

/** Latest approved visitor suggestions (places, foods, products), newest first. */
export async function listApprovedSuggestions(
  lang: Lang = "bn",
  limit = 10,
): Promise<CommunitySuggestion[]> {
  const db = getDb();
  return db
    .select({ s: suggestions, d: districts })
    .from(suggestions)
    .leftJoin(districts, eq(suggestions.districtId, districts.id))
    .where(eq(suggestions.status, "approved"))
    .orderBy(desc(suggestions.createdAt), desc(suggestions.id))
    .limit(limit)
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
