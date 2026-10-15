/**
 * Writing posts (signed-in users only): create with up to four photos from the same upload
 * pipeline, edit (text, which photos to keep, new photos; the post goes back to `pending`),
 * delete (rows and files), and comments. Users can only change their own posts.
 */
import { and, eq, inArray } from "drizzle-orm";
import { POST_PHOTOS_MAX } from "@/lib/community/rules";
import { getDb } from "../db/client";
import type { PostPhoto } from "../db/json-types";
import { likes, postComments, posts, reports } from "../db/schema";
import { deleteMedia, storeImagePair, type ImagePair } from "./media";

function store(pairs: ImagePair[]): PostPhoto[] {
  return pairs.map((pair) => {
    const s = storeImagePair(pair);
    return { src: s.src, thumb: s.thumb, width: s.width, height: s.height };
  });
}

export function createPost(input: {
  userId: number;
  body: string;
  pairs: ImagePair[];
  districtId: number | null;
}): number {
  const photos = store(input.pairs);
  try {
    return getDb()
      .insert(posts)
      .values({
        userId: input.userId,
        body: input.body,
        photos,
        districtId: input.districtId,
        status: "pending",
      })
      .returning({ id: posts.id })
      .get().id;
  } catch (error) {
    deleteMedia(photos.flatMap((p) => [p.src, p.thumb]));
    throw error;
  }
}

export function ownPost(userId: number, id: number) {
  return (
    getDb()
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .get() ?? null
  );
}

export type PostUpdate = {
  body: string;
  /** `src` of the existing photos to keep (others are deleted). */
  keep: string[];
  pairs: ImagePair[];
  districtId: number | null;
};

export type UpdateResult = { ok: true } | { ok: false; reason: "not_found" | "too_many" };

/** Edits the user's own post. The edited post needs approval again. */
export function updatePost(userId: number, id: number, update: PostUpdate): UpdateResult {
  const post = ownPost(userId, id);
  if (!post) return { ok: false, reason: "not_found" };
  const current = post.photos ?? [];
  const kept = current.filter((p) => update.keep.includes(p.src));
  if (kept.length + update.pairs.length > POST_PHOTOS_MAX) return { ok: false, reason: "too_many" };
  const added = store(update.pairs);
  const removed = current.filter((p) => !kept.includes(p));
  getDb()
    .update(posts)
    .set({
      body: update.body,
      photos: [...kept, ...added],
      districtId: update.districtId,
      status: "pending",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(posts.id, id))
    .run();
  deleteMedia(removed.flatMap((p) => [p.src, p.thumb]));
  return { ok: true };
}

/** Deletes the user's own post with its comments, reactions and photo files. */
export function deletePost(userId: number, id: number): boolean {
  const post = ownPost(userId, id);
  if (!post) return false;
  getDb().transaction((tx) => {
    tx.delete(likes)
      .where(and(eq(likes.targetType, "post"), eq(likes.targetId, id)))
      .run();
    tx.delete(reports)
      .where(and(eq(reports.targetType, "post"), eq(reports.targetId, id)))
      .run();
    tx.delete(posts).where(eq(posts.id, id)).run();
  });
  deleteMedia((post.photos ?? []).flatMap((p) => [p.src, p.thumb]));
  return true;
}

/** Deletes every post of a user (account deletion), files included. */
export function deleteAllPosts(userId: number): void {
  const db = getDb();
  const rows = db.select().from(posts).where(eq(posts.userId, userId)).all();
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);
  db.delete(likes)
    .where(and(eq(likes.targetType, "post"), inArray(likes.targetId, ids)))
    .run();
  db.delete(posts).where(inArray(posts.id, ids)).run();
  deleteMedia(rows.flatMap((r) => (r.photos ?? []).flatMap((p) => [p.src, p.thumb])));
}

export function isApprovedPost(id: number): boolean {
  return Boolean(
    getDb()
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.status, "approved")))
      .get(),
  );
}

export function addPostComment(input: { postId: number; userId: number; body: string }): number {
  return getDb()
    .insert(postComments)
    .values({ ...input, status: "pending" })
    .returning({ id: postComments.id })
    .get().id;
}
