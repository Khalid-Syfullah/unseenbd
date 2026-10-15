import { positiveInt } from "@/server/api";
import { clearHistory, listHistory, recordView } from "@/server/account/history";
import { toLang } from "@/server/data/lang";
import { authed, fail, ok, readJson } from "@/server/auth/http";

/**
 * `GET /api/me/history?page=&lang=` → `{items, page, pageCount, total, pageSize}`: the place and
 * district pages viewed, newest first, 20 per page.
 */
export const GET = authed((ctx, request) => {
  const page = positiveInt(request.nextUrl.searchParams.get("page"));
  if (page === null) return fail(400, "bad_request", "page must be a positive integer.");
  const lang = toLang(request.nextUrl.searchParams.get("lang"));
  return ok(listHistory(ctx.user.id, { page: page ?? 1, lang }));
});

/** `POST /api/me/history {placeId} | {districtId}` → `204`: records a view. */
export const POST = authed(async (ctx, request) => {
  const parsed = await readJson(request, 512);
  if (!parsed.ok) return parsed.response;
  const { placeId, districtId } = parsed.body;
  if (!recordView(ctx.user.id, { placeId, districtId })) {
    return fail(400, "bad_request", "Send {placeId} or {districtId} of a page that exists.");
  }
  return ok({ recorded: true });
});

/** `DELETE /api/me/history` → `{deleted}`: forgets the whole history. */
export const DELETE = authed((ctx) => ok({ deleted: clearHistory(ctx.user.id) }));
