/**
 * Writing owner listings: a submission (text, prices and photos from the same upload pipeline),
 * edits and deletes by the owner, and reviews. Everything new, and every edit, is `pending`
 * until a moderator approves it.
 */
import { and, eq } from "drizzle-orm";
import type { ListingInput, Tier } from "@/lib/listings/rules";
import { getDb } from "../db/client";
import { likes, listingPhotos, listingPrices, listingReviews, listings } from "../db/schema";
import { deleteMedia, storeImagePair, type ImagePair, type StoredImage } from "../community/media";
import { districtIdOf } from "../community/submissions";

type KeptPhoto = { src: string; thumb: string | null; width: number | null; height: number | null };

export type PhotoCountResult = { ok: true } | { ok: false; reason: "too_few" | "too_many" };

/** True when `count` photos fit the tier's range. */
export function checkPhotoCount(tier: Tier, count: number): PhotoCountResult {
  if (count < tier.minPhotos) return { ok: false, reason: "too_few" };
  if (count > tier.maxPhotos) return { ok: false, reason: "too_many" };
  return { ok: true };
}

function photoRows(listingId: number, photos: KeptPhoto[]) {
  return photos.map((p, position) => ({ listingId, position, ...p }));
}

function priceRows(listingId: number, input: ListingInput) {
  return input.prices.map((p, position) => ({
    listingId,
    position,
    item: p.item,
    amount: p.amount,
    unit: p.unit || null,
  }));
}

const fields = (input: ListingInput, districtId: number) => ({
  kind: input.kind,
  category: input.category,
  sizeTier: input.sizeTier,
  name: input.name,
  districtId,
  area: input.area || null,
  description: input.description,
  phone: input.phone,
  whatsapp: input.whatsapp || null,
  socialUrl: input.socialUrl || null,
  contactName: input.contactName,
});

const asKept = (s: StoredImage): KeptPhoto => ({
  src: s.src,
  thumb: s.thumb,
  width: s.width,
  height: s.height,
});

/** Stores the files and inserts a `pending` listing. Null when the district is unknown. */
export function createListing(
  input: ListingInput,
  pairs: ImagePair[],
  owner: { userId: number | null; ipHash: string },
): number | null {
  const districtId = districtIdOf(input.district);
  if (!districtId) return null;
  const stored = pairs.map((pair) => storeImagePair(pair));
  try {
    return getDb().transaction((tx) => {
      const id = tx
        .insert(listings)
        .values({
          ...fields(input, districtId),
          userId: owner.userId,
          ipHash: owner.ipHash,
          sponsored: false,
          status: "pending",
        })
        .returning({ id: listings.id })
        .get().id;
      const prices = priceRows(id, input);
      if (prices.length) tx.insert(listingPrices).values(prices).run();
      tx.insert(listingPhotos)
        .values(photoRows(id, stored.map(asKept)))
        .run();
      return id;
    });
  } catch (error) {
    deleteMedia(stored.flatMap((s) => [s.src, s.thumb]));
    throw error;
  }
}

export function ownListing(userId: number, id: number) {
  return (
    getDb()
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.userId, userId)))
      .get() ?? null
  );
}

export type UpdateResult =
  { ok: true } | { ok: false; reason: "not_found" | "district" | "too_few" | "too_many" };

/**
 * Edits the owner's own listing: text, prices, which photos to keep (by `src`) and new photos.
 * The edited listing needs approval again.
 */
export function updateListing(
  userId: number,
  id: number,
  input: ListingInput,
  keep: string[],
  pairs: ImagePair[],
  tier: Tier,
): UpdateResult {
  const row = ownListing(userId, id);
  if (!row) return { ok: false, reason: "not_found" };
  const districtId = districtIdOf(input.district);
  if (!districtId) return { ok: false, reason: "district" };
  const db = getDb();
  const current = db.select().from(listingPhotos).where(eq(listingPhotos.listingId, id)).all();
  const kept = current.filter((p) => keep.includes(p.src));
  const count = checkPhotoCount(tier, kept.length + pairs.length);
  if (!count.ok) return count;
  const added = pairs.map((pair) => storeImagePair(pair));
  const removed = current.filter((p) => !kept.includes(p));
  try {
    db.transaction((tx) => {
      tx.update(listings)
        .set({
          ...fields(input, districtId),
          status: "pending",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(listings.id, id))
        .run();
      tx.delete(listingPrices).where(eq(listingPrices.listingId, id)).run();
      const prices = priceRows(id, input);
      if (prices.length) tx.insert(listingPrices).values(prices).run();
      tx.delete(listingPhotos).where(eq(listingPhotos.listingId, id)).run();
      const all: KeptPhoto[] = [
        ...kept.map((p) => ({ src: p.src, thumb: p.thumb, width: p.width, height: p.height })),
        ...added.map(asKept),
      ];
      tx.insert(listingPhotos).values(photoRows(id, all)).run();
    });
  } catch (error) {
    deleteMedia(added.flatMap((s) => [s.src, s.thumb]));
    throw error;
  }
  deleteMedia(removed.flatMap((p) => [p.src, p.thumb]));
  return { ok: true };
}

/** Deletes a listing with its prices, photos (rows and files) and reviews. */
export function removeListing(id: number): boolean {
  const db = getDb();
  const photos = db.select().from(listingPhotos).where(eq(listingPhotos.listingId, id)).all();
  const changes = db.transaction((tx) => {
    tx.delete(likes)
      .where(and(eq(likes.targetType, "listing"), eq(likes.targetId, id)))
      .run();
    return tx.delete(listings).where(eq(listings.id, id)).run().changes;
  });
  deleteMedia(photos.flatMap((p) => [p.src, p.thumb]));
  return changes > 0;
}

/** Deletes the owner's own listing. */
export function deleteOwnListing(userId: number, id: number): boolean {
  return ownListing(userId, id) ? removeListing(id) : false;
}

/** True when the listing exists and is approved (only those take reviews). */
export function isApprovedListing(id: number): boolean {
  return Boolean(
    getDb()
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.status, "approved")))
      .get(),
  );
}

export function addListingReview(input: {
  listingId: number;
  name: string;
  rating: number;
  body: string | null;
  userId: number | null;
}): number {
  return getDb()
    .insert(listingReviews)
    .values({ ...input, status: "pending" })
    .returning({ id: listingReviews.id })
    .get().id;
}
