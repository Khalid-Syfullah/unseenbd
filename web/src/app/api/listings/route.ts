import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isListingKind } from "@/lib/listings/rules";
import { idParam, ok } from "@/server/auth/http";
import { community, invalid, quotaExceeded } from "@/server/community/http";
import { consumeQuota, quotaStatus, refundQuota } from "@/server/community/quota";
import { listListings } from "@/server/data/listings";
import { toLang } from "@/server/data/lang";
import { newPhotoCheck, parseListingForm } from "@/server/listings/http";
import { createListing } from "@/server/listings/write";

/**
 * `GET /api/listings?kind=&district=&page=&lang=` → a page of approved owner listings
 * (sponsored first, then newest).
 */
export const GET = community(async (_visitor, request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind");
  const page = await listListings(
    { kind: isListingKind(kind) ? kind : null, district: params.get("district") || null },
    { page: idParam(params.get("page")) ?? 1, lang: toLang(params.get("lang")) },
  );
  return NextResponse.json(page, { headers: { "Cache-Control": "public, max-age=60" } });
});

/**
 * `POST /api/listings` (multipart): the listing fields, `prices` (JSON array of
 * `{item, amount, unit}`), `photo`/`thumb` pairs and the hidden honeypot field. Open to everyone
 * (signed in, the listing joins "My listings"); three a day per IP or owner. Stored `pending`
 * → `201 {id, status, remaining}`. A filled honeypot gets the same answer and stores nothing.
 */
export const POST = community(async (visitor, request) => {
  const read = await parseListingForm(request);
  if (!read.ok) return read.response;
  const { input, tier, pairs, honeypot } = read.parsed;
  if (honeypot) return ok({ id: 0, status: "pending", limit: 0, used: 0, remaining: 0 }, 201);
  const refused = newPhotoCheck(tier, pairs.length);
  if (refused) return refused;

  const key = visitor.userId ? `u:${visitor.userId}` : visitor.ipHash;
  if (!consumeQuota("listings", key)) return quotaExceeded(quotaStatus("listings", key).limit);
  let id: number | null;
  try {
    id = createListing(input, pairs, { userId: visitor.userId, ipHash: visitor.ipHash });
  } catch (error) {
    refundQuota("listings", key);
    throw error;
  }
  if (!id) {
    refundQuota("listings", key);
    return invalid("district");
  }
  return ok({ id, status: "pending", ...quotaStatus("listings", key) }, 201);
});
