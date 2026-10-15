/**
 * The directory and owner listings. The seeded directory (hotels, resorts, restaurants, malls)
 * is a snapshot; owner listings start empty and only `approved` ones are public. A listing's
 * owner and moderators can also see it while it is pending or rejected.
 */
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { areaChip, areaText, categoryText, type DirectorySection } from "@/lib/directory";
import {
  BUSINESS_CATEGORIES,
  CATEGORY_PAGE,
  tiersFrom,
  type DirectoryPage,
  type ListingKind,
  type SizeTier,
  type Tier,
} from "@/lib/listings/rules";
import { getDb } from "../db/client";
import {
  directory,
  districts,
  listingPhotos,
  listingPrices,
  listingReviews,
  listings,
  reference,
} from "../db/schema";
import type { Lang } from "./lang";
import { nameIn } from "./shared";

export type DirectoryItem = {
  id: number;
  section: DirectorySection;
  name: string;
  category: string;
  area: string;
  /** Raw Bengali area (for the map link and the chip). */
  areaBn: string | null;
  chip: string;
  chipLabel: string;
  rating: number | null;
  reviews: number | null;
};

/** The seeded directory of one section (position order). */
export async function listDirectory(
  section: DirectorySection,
  lang: Lang,
): Promise<DirectoryItem[]> {
  return getDb()
    .select()
    .from(directory)
    .where(eq(directory.section, section))
    .orderBy(asc(directory.position))
    .all()
    .map((r) => {
      const chip = areaChip(section, r.areaBn);
      return {
        id: r.id,
        section,
        name: r.name,
        category: categoryText(r.categoryBn, lang),
        area: areaText(r.areaBn, lang),
        areaBn: r.areaBn,
        chip,
        chipLabel: areaText(chip, lang),
        rating: r.rating,
        reviews: r.reviews,
      };
    });
}

/** The size tiers (`reference.listing_submission_tiers`). */
export function listingTiers(): Tier[] {
  const row = getDb()
    .select()
    .from(reference)
    .where(eq(reference.key, "listing_submission_tiers"))
    .get();
  return tiersFrom(row?.value);
}

export type ListingPhoto = { src: string; thumb: string | null; width: number; height: number };

export type ListingSummary = {
  id: number;
  kind: ListingKind;
  category: string | null;
  sizeTier: SizeTier;
  name: string;
  area: string | null;
  district: { slug: string; name: string };
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  socialUrl: string | null;
  sponsored: boolean;
  status: "pending" | "approved" | "rejected";
  photo: ListingPhoto | null;
  priceFrom: number | null;
  /** Mean of approved reviews (1–5), or null. */
  rating: number | null;
  reviews: number;
  createdAt: string;
};

type ListingRow = typeof listings.$inferSelect;

function summaries(
  rows: { l: ListingRow; d: typeof districts.$inferSelect }[],
  lang: Lang,
): ListingSummary[] {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map((r) => r.l.id);
  const photoRows = db
    .select()
    .from(listingPhotos)
    .where(and(inArray(listingPhotos.listingId, ids), eq(listingPhotos.position, 0)))
    .all();
  const photoBy = new Map(photoRows.map((p) => [p.listingId, p]));
  const priceRows = db
    .select({ id: listingPrices.listingId, min: sql<number>`min(${listingPrices.amount})` })
    .from(listingPrices)
    .where(inArray(listingPrices.listingId, ids))
    .groupBy(listingPrices.listingId)
    .all();
  const priceBy = new Map(priceRows.map((p) => [p.id, p.min]));
  const ratingRows = db
    .select({
      id: listingReviews.listingId,
      avg: sql<number>`avg(${listingReviews.rating})`,
      n: sql<number>`count(*)`,
    })
    .from(listingReviews)
    .where(and(inArray(listingReviews.listingId, ids), eq(listingReviews.status, "approved")))
    .groupBy(listingReviews.listingId)
    .all();
  const ratingBy = new Map(ratingRows.map((r) => [r.id, r]));
  return rows.map(({ l, d }) => {
    const p = photoBy.get(l.id);
    const r = ratingBy.get(l.id);
    return {
      id: l.id,
      kind: l.kind,
      category: l.category,
      sizeTier: l.sizeTier,
      name: l.name,
      area: l.area,
      district: { slug: d.slug, name: nameIn(lang, d) },
      description: l.description,
      phone: l.phone,
      whatsapp: l.whatsapp,
      socialUrl: l.socialUrl,
      sponsored: l.sponsored,
      status: l.status,
      photo: p
        ? { src: p.src, thumb: p.thumb, width: p.width ?? 800, height: p.height ?? 600 }
        : null,
      priceFrom: priceBy.get(l.id) ?? null,
      rating: r ? Math.round(r.avg * 10) / 10 : null,
      reviews: r?.n ?? 0,
      createdAt: l.createdAt,
    };
  });
}

function query(where: SQL | undefined) {
  return getDb()
    .select({ l: listings, d: districts })
    .from(listings)
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .where(where)
    .orderBy(desc(listings.sponsored), desc(listings.createdAt), desc(listings.id));
}

export const LISTINGS_PAGE_SIZE = 24;

export type ListingFilter = {
  kind?: ListingKind | null;
  /** Business categories to include (a directory page's). */
  categories?: readonly string[];
  district?: string | null;
};

function filterWhere(filter: ListingFilter): SQL | undefined {
  const parts: (SQL | undefined)[] = [eq(listings.status, "approved")];
  if (filter.kind) parts.push(eq(listings.kind, filter.kind));
  if (filter.categories) parts.push(inArray(listings.category, [...filter.categories]));
  if (filter.district) parts.push(eq(districts.slug, filter.district));
  return and(...parts);
}

/** A page of approved owner listings, sponsored first, then newest. */
export async function listListings(
  filter: ListingFilter = {},
  { page = 1, pageSize = LISTINGS_PAGE_SIZE, lang = "bn" as Lang } = {},
): Promise<{ items: ListingSummary[]; total: number; page: number; pageCount: number }> {
  const where = filterWhere(filter);
  const total =
    getDb()
      .select({ n: sql<number>`count(*)` })
      .from(listings)
      .innerJoin(districts, eq(listings.districtId, districts.id))
      .where(where)
      .get()?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const rows = query(where)
    .limit(pageSize)
    .offset((current - 1) * pageSize)
    .all();
  return { items: summaries(rows, lang), total, page: current, pageCount };
}

/** Counts of approved listings per kind, for the tabs of `/listings`. */
export async function countListingsByKind(): Promise<Record<ListingKind, number>> {
  const rows = getDb()
    .select({ kind: listings.kind, n: sql<number>`count(*)` })
    .from(listings)
    .where(eq(listings.status, "approved"))
    .groupBy(listings.kind)
    .all();
  const out: Record<ListingKind, number> = { business: 0, food: 0, product: 0 };
  for (const r of rows) out[r.kind] = r.n;
  return out;
}

/** Approved owner listings for a directory page: `/stay`, `/restaurants` or `/shopping`. */
export async function listPageListings(
  page: DirectoryPage,
  lang: Lang,
): Promise<{ businesses: ListingSummary[]; extra: ListingSummary[] }> {
  const categories = BUSINESS_CATEGORIES.filter((c) => CATEGORY_PAGE[c] === page);
  const businesses = summaries(query(filterWhere({ kind: "business", categories })).all(), lang);
  const extraKind = page === "restaurants" ? "food" : page === "shopping" ? "product" : null;
  const extra = extraKind ? summaries(query(filterWhere({ kind: extraKind })).all(), lang) : [];
  return { businesses, extra };
}

export type ListingPrice = { item: string; amount: number; unit: string | null };
export type ListingReview = {
  id: number;
  name: string;
  rating: number;
  body: string | null;
  createdAt: string;
};
export type ListingDetail = ListingSummary & {
  contactName: string | null;
  prices: ListingPrice[];
  photos: ListingPhoto[];
  reviewList: ListingReview[];
  ownerId: number | null;
};

/**
 * One listing. Approved listings are public; the owner and admins see their own in any state
 * (pass `viewer`); everybody else gets null.
 */
export async function getListing(
  id: number,
  lang: Lang,
  viewer: { id: number; admin: boolean } | null = null,
): Promise<ListingDetail | null> {
  const db = getDb();
  const row = query(eq(listings.id, id)).get();
  if (!row) return null;
  const mine = viewer && (viewer.admin || row.l.userId === viewer.id);
  if (row.l.status !== "approved" && !mine) return null;
  const [summary] = summaries([row], lang);
  const prices = db
    .select()
    .from(listingPrices)
    .where(eq(listingPrices.listingId, id))
    .orderBy(asc(listingPrices.position))
    .all()
    .map((p) => ({ item: p.item, amount: p.amount, unit: p.unit }));
  const photos = db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, id))
    .orderBy(asc(listingPhotos.position))
    .all()
    .map((p) => ({ src: p.src, thumb: p.thumb, width: p.width ?? 800, height: p.height ?? 600 }));
  const reviewList = db
    .select({
      id: listingReviews.id,
      name: listingReviews.name,
      rating: listingReviews.rating,
      body: listingReviews.body,
      createdAt: listingReviews.createdAt,
    })
    .from(listingReviews)
    .where(and(eq(listingReviews.listingId, id), eq(listingReviews.status, "approved")))
    .orderBy(desc(listingReviews.createdAt), desc(listingReviews.id))
    .limit(100)
    .all();
  return {
    ...summary!,
    contactName: row.l.contactName,
    prices,
    photos,
    reviewList,
    ownerId: row.l.userId,
  };
}

/** A signed-in owner's listings in every state, newest first. */
export async function listMyListings(userId: number, lang: Lang): Promise<ListingSummary[]> {
  const rows = getDb()
    .select({ l: listings, d: districts })
    .from(listings)
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .where(eq(listings.userId, userId))
    .orderBy(desc(listings.createdAt), desc(listings.id))
    .all();
  return summaries(rows, lang);
}
