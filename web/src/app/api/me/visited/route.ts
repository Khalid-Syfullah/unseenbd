import { applyVisitedDelta, getVisited, parseVisitedDelta } from "@/server/account/sync";
import { authed, fail, ok, readJson } from "@/server/auth/http";

/** `GET /api/me/visited` → `{ids}`: the account's visited district ids. */
export const GET = authed((ctx) => ok({ ids: getVisited(ctx.user.id) }));

/** `POST /api/me/visited {add, remove}` → `{ids}` after the change. */
export const POST = authed(async (ctx, request) => {
  const parsed = await readJson(request, 4096);
  if (!parsed.ok) return parsed.response;
  const delta = parseVisitedDelta(parsed.body);
  if (!delta) return fail(400, "bad_request", "Send {add: number[], remove: number[]}.");
  return ok({ ids: applyVisitedDelta(ctx.user.id, delta) });
});
