/** Reading a listing submission from a multipart form (shared by create and edit). */
import type { NextResponse } from "next/server";
import { PHOTO_BYTES_MAX, THUMB_BYTES_MAX } from "@/lib/community/rules";
import {
  checkListing,
  LISTING_PHOTOS_ABSOLUTE_MAX,
  type ListingInput,
  type Tier,
} from "@/lib/listings/rules";
import { formText, imageError, invalid, readForm } from "../community/http";
import { readImagePairs, type ImagePair } from "../community/media";
import { listingTiers } from "../data/listings";
import { checkPhotoCount } from "./write";
import type { NextRequest } from "next/server";

export const LISTING_BODY_MAX =
  LISTING_PHOTOS_ABSOLUTE_MAX * (PHOTO_BYTES_MAX + THUMB_BYTES_MAX) + 128 * 1024;

/** The hidden field bots fill in; a human never sees it. */
export const HONEYPOT_FIELD = "company_url";

export type ParsedListing = {
  input: ListingInput;
  tier: Tier;
  pairs: ImagePair[];
  keep: string[];
  honeypot: boolean;
};

/**
 * Reads and checks a listing form. `existingPhotos` is how many photos an edited listing keeps
 * (the `keep` field), which count towards the tier's photo range.
 */
export async function parseListingForm(
  request: NextRequest,
): Promise<{ ok: true; parsed: ParsedListing } | { ok: false; response: NextResponse }> {
  const read = await readForm(request, LISTING_BODY_MAX);
  if (!read.ok) return read;
  const { form } = read;
  const honeypot = formText(form, HONEYPOT_FIELD).trim() !== "";

  let prices: unknown = [];
  try {
    prices = JSON.parse(formText(form, "prices") || "[]");
  } catch {
    return { ok: false, response: invalid("prices") };
  }
  const tiers = listingTiers();
  const checked = checkListing(
    {
      kind: formText(form, "kind"),
      category: formText(form, "category"),
      sizeTier: formText(form, "sizeTier"),
      name: formText(form, "name"),
      district: formText(form, "district"),
      area: formText(form, "area"),
      description: formText(form, "description"),
      phone: formText(form, "phone"),
      whatsapp: formText(form, "whatsapp"),
      socialUrl: formText(form, "socialUrl"),
      contactName: formText(form, "contactName"),
      prices,
    },
    tiers,
  );
  if (!checked.ok) return { ok: false, response: invalid(checked.field, checked.reason) };
  const tier = tiers.find((t) => t.size === checked.value.sizeTier)!;

  let keep: string[] = [];
  try {
    const parsed: unknown = JSON.parse(formText(form, "keep") || "[]");
    if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === "string")) throw new Error();
    keep = parsed;
  } catch {
    return { ok: false, response: invalid("keep") };
  }

  const images = await readImagePairs(form, tier.maxPhotos);
  if (!images.ok) {
    return {
      ok: false,
      response:
        images.reason === "too_many"
          ? invalid("photos", "too_many")
          : imageError(images.status, images.reason),
    };
  }
  return { ok: true, parsed: { input: checked.value, tier, pairs: images.pairs, keep, honeypot } };
}

/** The photo-range check for a new listing (no kept photos). */
export function newPhotoCheck(tier: Tier, count: number): NextResponse | null {
  const result = checkPhotoCount(tier, count);
  return result.ok ? null : invalid("photos", result.reason);
}
