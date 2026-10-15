/**
 * Writing community photos: an upload batch from `/upload`, comments, and deleting a user's own
 * photos (rows and files). Everything new is `pending` until a moderator approves it.
 */
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import { districts, likes, photoComments, photos, places, reports } from "../db/schema";
import { deleteMedia, storeImagePair, type ImagePair } from "./media";

export type PlaceRef = { districtId: number; placeId: number | null };

/**
 * Resolves the district slug and optional place slug of an upload. The place must be in the
 * district. Null when either is unknown.
 */
export function resolveLocation(districtSlug: string, placeSlug: string | null): PlaceRef | null {
  const db = getDb();
  const district = db
    .select({ id: districts.id })
    .from(districts)
    .where(eq(districts.slug, districtSlug))
    .get();
  if (!district) return null;
  if (!placeSlug) return { districtId: district.id, placeId: null };
  const place = db
    .select({ id: places.id, districtId: places.districtId })
    .from(places)
    .where(eq(places.slug, placeSlug))
    .get();
  if (!place || place.districtId !== district.id) return null;
  return { districtId: district.id, placeId: place.id };
}

export type NewPhotoBatch = {
  pairs: ImagePair[];
  location: PlaceRef;
  uploaderName: string;
  uploaderEmail: string | null;
  caption: string | null;
  userId: number | null;
  ipHash: string;
};

/** Stores the files and inserts one `pending` row per photo. Returns the new ids. */
export function createPhotoBatch(batch: NewPhotoBatch): number[] {
  const stored = batch.pairs.map((pair) => storeImagePair(pair));
  try {
    return getDb().transaction((tx) =>
      stored.map(
        (img) =>
          tx
            .insert(photos)
            .values({
              userId: batch.userId,
              uploaderName: batch.uploaderName,
              uploaderEmail: batch.uploaderEmail,
              districtId: batch.location.districtId,
              placeId: batch.location.placeId,
              caption: batch.caption,
              src: img.src,
              thumb: img.thumb,
              width: img.width,
              height: img.height,
              status: "pending",
              isPublic: true,
              ipHash: batch.ipHash,
            })
            .returning({ id: photos.id })
            .get().id,
      ),
    );
  } catch (error) {
    deleteMedia(stored.flatMap((s) => [s.src, s.thumb]));
    throw error;
  }
}

/** True when the photo exists, is approved and public (comments, likes, reports need that). */
export function isPublicPhoto(id: number): boolean {
  return Boolean(
    getDb()
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.status, "approved"), eq(photos.isPublic, true)))
      .get(),
  );
}

export function addPhotoComment(input: {
  photoId: number;
  name: string;
  body: string;
  userId: number | null;
  ipHash: string;
}): number {
  return getDb()
    .insert(photoComments)
    .values({ ...input, status: "pending" })
    .returning({ id: photoComments.id })
    .get().id;
}

/** Deletes photos (rows and files). With `userId`, only that user's. Returns the count. */
export function deletePhotos(where: { userId: number; ids?: number[] }): number {
  const db = getDb();
  const condition = where.ids
    ? and(eq(photos.userId, where.userId), inArray(photos.id, where.ids))
    : eq(photos.userId, where.userId);
  const rows = db
    .select({ id: photos.id, src: photos.src, thumb: photos.thumb })
    .from(photos)
    .where(condition)
    .all();
  if (!rows.length) return 0;
  const ids = rows.map((r) => r.id);
  const changes = db.transaction((tx) => {
    tx.delete(likes)
      .where(and(eq(likes.targetType, "photo"), inArray(likes.targetId, ids)))
      .run();
    tx.delete(reports)
      .where(and(eq(reports.targetType, "photo"), inArray(reports.targetId, ids)))
      .run();
    return tx.delete(photos).where(inArray(photos.id, ids)).run().changes;
  });
  deleteMedia(rows.flatMap((r) => [r.src, r.thumb]));
  return changes;
}
