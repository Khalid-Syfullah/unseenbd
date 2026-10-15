/**
 * Owner listings: kinds, size tiers and the checks shared by the form (early hints) and the API
 * (the checks that count). The tier limits come from `data/reference.json` →
 * `listing_submission_tiers` (the `reference` table); `tiersFrom` turns that block into numbers.
 */
import { checkText } from "@/lib/community/text";

export const LISTING_KINDS = ["business", "food", "product"] as const;
export type ListingKind = (typeof LISTING_KINDS)[number];

export function isListingKind(value: unknown): value is ListingKind {
  return typeof value === "string" && (LISTING_KINDS as readonly string[]).includes(value);
}

/** What a "business" is: it decides which directory page (stay, restaurants, shopping) lists it. */
export const BUSINESS_CATEGORIES = [
  "hotel",
  "resort",
  "guesthouse",
  "restaurant",
  "cafe",
  "mall",
  "shop",
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const DIRECTORY_PAGES = ["stay", "restaurants", "shopping"] as const;
export type DirectoryPage = (typeof DIRECTORY_PAGES)[number];

/** The directory page a business category belongs to. */
export const CATEGORY_PAGE: Record<BusinessCategory, DirectoryPage> = {
  hotel: "stay",
  resort: "stay",
  guesthouse: "stay",
  restaurant: "restaurants",
  cafe: "restaurants",
  mall: "shopping",
  shop: "shopping",
};

export const SIZE_TIERS = ["small", "medium", "large"] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];

export type Tier = { size: SizeTier; maxPrices: number; minPhotos: number; maxPhotos: number };

/** Used only when the reference block is missing (it is seeded, so this is a safety net). */
export const DEFAULT_TIERS: Tier[] = [
  { size: "small", maxPrices: 5, minPhotos: 3, maxPhotos: 5 },
  { size: "medium", maxPrices: 12, minPhotos: 3, maxPhotos: 8 },
  { size: "large", maxPrices: 25, minPhotos: 3, maxPhotos: 10 },
];

/** Reads `listing_submission_tiers` (`{size, max_prices, photos: "3–5"}` rows). */
export function tiersFrom(value: unknown): Tier[] {
  if (!Array.isArray(value)) return DEFAULT_TIERS;
  const out: Tier[] = [];
  for (const row of value as Record<string, unknown>[]) {
    const size = row?.size;
    const range = String(row?.photos ?? "").match(/(\d+)\D+(\d+)/);
    const max = Number(row?.max_prices);
    if (!SIZE_TIERS.includes(size as SizeTier) || !range || !Number.isInteger(max)) continue;
    out.push({
      size: size as SizeTier,
      maxPrices: max,
      minPhotos: Number(range[1]),
      maxPhotos: Number(range[2]),
    });
  }
  return out.length === SIZE_TIERS.length ? out : DEFAULT_TIERS;
}

export const NAME_MAX = 80;
export const AREA_MAX = 80;
export const DESCRIPTION_MAX = 600;
export const CONTACT_NAME_MAX = 60;
export const PRICE_ITEM_MAX = 60;
export const PRICE_UNIT_MAX = 30;
export const PRICE_AMOUNT_MAX = 10_000_000;
export const SOCIAL_URL_MAX = 200;
export const REVIEW_BODY_MAX = 300;

const PHONE = /^01[3-9]\d{8}$/;

/** A Bangladesh mobile number as `01XXXXXXXXX`, accepting spaces, dashes, `+880` and `880`. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/[\s-]/g, "").replace(/^\+?880/, "0");
  return PHONE.test(digits) ? digits : null;
}

/** `https://wa.me/8801XXXXXXXXX` for a stored `01XXXXXXXXX`. */
export function whatsappUrl(phone: string): string {
  return `https://wa.me/880${phone.slice(1)}`;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export type PriceRow = { item: string; amount: number; unit: string };

export type ListingInput = {
  kind: ListingKind;
  category: BusinessCategory | null;
  sizeTier: SizeTier;
  name: string;
  district: string;
  area: string;
  description: string;
  prices: PriceRow[];
  phone: string;
  whatsapp: string;
  socialUrl: string;
  contactName: string;
};

export type ListingCheck =
  { ok: true; value: ListingInput } | { ok: false; field: string; reason: string };

const bad = (field: string, reason = "invalid"): ListingCheck => ({ ok: false, field, reason });

/** Cleans and checks the text part of a submission (photos are checked separately). */
export function checkListing(raw: Record<string, unknown>, tiers: Tier[]): ListingCheck {
  const kind = raw.kind;
  if (!isListingKind(kind)) return bad("kind");
  const sizeTier = raw.sizeTier;
  const tier = tiers.find((t) => t.size === sizeTier);
  if (!tier) return bad("sizeTier");

  let category: BusinessCategory | null = null;
  if (kind === "business") {
    if (!(BUSINESS_CATEGORIES as readonly string[]).includes(String(raw.category))) {
      return bad("category");
    }
    category = raw.category as BusinessCategory;
  }

  const name = checkText(raw.name, NAME_MAX, { required: true });
  if (!name.ok) return bad("name", name.reason);
  const area = checkText(raw.area, AREA_MAX);
  if (!area.ok) return bad("area", area.reason);
  const description = checkText(raw.description, DESCRIPTION_MAX, {
    required: true,
    multiline: true,
  });
  if (!description.ok) return bad("description", description.reason);
  const contactName = checkText(raw.contactName, CONTACT_NAME_MAX, { required: true });
  if (!contactName.ok) return bad("contactName", contactName.reason);
  const district = typeof raw.district === "string" ? raw.district.trim() : "";
  if (!district) return bad("district", "missing");

  const phone = normalizePhone(String(raw.phone ?? ""));
  if (!phone) return bad("phone", String(raw.phone ?? "").trim() ? "invalid" : "missing");
  let whatsapp = "";
  if (String(raw.whatsapp ?? "").trim()) {
    const w = normalizePhone(String(raw.whatsapp));
    if (!w) return bad("whatsapp");
    whatsapp = w;
  }
  const socialUrl = String(raw.socialUrl ?? "").trim();
  if (socialUrl && (socialUrl.length > SOCIAL_URL_MAX || !isHttpUrl(socialUrl))) {
    return bad("socialUrl");
  }

  const rows = Array.isArray(raw.prices) ? raw.prices : [];
  const prices: PriceRow[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    const item = checkText(row?.item, PRICE_ITEM_MAX);
    const unit = checkText(row?.unit, PRICE_UNIT_MAX);
    if (!item.ok || !unit.ok) return bad("prices", "long");
    const hasAmount = String(row?.amount ?? "").trim() !== "";
    if (!item.value && !hasAmount && !unit.value) continue; // an empty row is ignored
    const amount = Number(row?.amount);
    if (!item.value || !Number.isInteger(amount) || amount < 0 || amount > PRICE_AMOUNT_MAX) {
      return bad("prices");
    }
    prices.push({ item: item.value, amount, unit: unit.value });
  }
  if (prices.length > tier.maxPrices) return bad("prices", "too_many");

  return {
    ok: true,
    value: {
      kind,
      category,
      sizeTier: tier.size,
      name: name.value,
      district,
      area: area.value,
      description: description.value,
      prices,
      phone,
      whatsapp,
      socialUrl,
      contactName: contactName.value,
    },
  };
}

/** The most photos any tier allows (sizes the largest request body). */
export const LISTING_PHOTOS_ABSOLUTE_MAX = 10;
