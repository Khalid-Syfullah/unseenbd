import { applyBucketDelta, getBucketOf, parseBucketDelta } from "@/server/account/sync";
import { authed, fail, ok, readJson } from "@/server/auth/http";

/** `GET /api/me/wishlist` → `{bucket: {placeSlug: "want" | "been"}}`. */
export const GET = authed((ctx) => ok({ bucket: getBucketOf(ctx.user.id) }));

/** `POST /api/me/wishlist {set: {slug: status}, clear: slug[]}` → `{bucket}` after the change. */
export const POST = authed(async (ctx, request) => {
  const parsed = await readJson(request, 64 * 1024);
  if (!parsed.ok) return parsed.response;
  const delta = parseBucketDelta(parsed.body);
  if (!delta) return fail(400, "bad_request", "Send {set, clear}.");
  return ok({ bucket: applyBucketDelta(ctx.user.id, delta) });
});
