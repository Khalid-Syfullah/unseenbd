import { checkText } from "@/lib/community/text";
import { NAME_MAX } from "@/lib/community/rules";
import { REVIEW_BODY_MAX } from "@/lib/listings/rules";
import { fail, idParam, ok, readJson } from "@/server/auth/http";
import { community, invalid, quotaExceeded, quotaKey } from "@/server/community/http";
import { consumeQuota, quotaStatus } from "@/server/community/quota";
import { addListingReview, isApprovedListing } from "@/server/listings/write";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `POST /api/listings/:id/reviews` `{name, rating: 1–5, body?}` → `201`. Reviews wait for a
 * moderator (`pending`). Counts against the visitor's daily comment quota.
 */
export const POST = community<Ctx>(async (visitor, request, { params }) => {
  const id = idParam((await params).id);
  if (!id || !isApprovedListing(id)) return fail(404, "not_found");
  const read = await readJson(request, 4096);
  if (!read.ok) return read.response;
  const name = checkText(read.body.name, NAME_MAX, { required: true });
  if (!name.ok) return invalid("name", name.reason);
  const body = checkText(read.body.body, REVIEW_BODY_MAX, { multiline: true });
  if (!body.ok) return invalid("body", body.reason);
  const rating = Number(read.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return invalid("rating");
  const key = quotaKey(visitor);
  if (!consumeQuota("comments", key)) return quotaExceeded(quotaStatus("comments", key).limit);
  const reviewId = addListingReview({
    listingId: id,
    name: name.value,
    rating,
    body: body.value || null,
    userId: visitor.userId,
  });
  return ok({ id: reviewId, status: "pending" }, 201);
});
