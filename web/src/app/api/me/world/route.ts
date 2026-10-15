import { applyWorldDelta, getWorldOf, parseWorldDelta } from "@/server/account/sync";
import { authed, fail, ok, readJson } from "@/server/auth/http";

/** `GET /api/me/world` → `{marks: {country: "visited" | "wish"}}`. */
export const GET = authed((ctx) => ok({ marks: getWorldOf(ctx.user.id) }));

/** `POST /api/me/world {set: {country: mark}, clear: country[]}` → `{marks}` after the change. */
export const POST = authed(async (ctx, request) => {
  const parsed = await readJson(request, 32 * 1024);
  if (!parsed.ok) return parsed.response;
  const delta = parseWorldDelta(parsed.body);
  if (!delta) return fail(400, "bad_request", "Send {set, clear}.");
  return ok({ marks: applyWorldDelta(ctx.user.id, delta) });
});
