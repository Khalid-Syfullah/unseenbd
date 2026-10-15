import { applyStory, getStoryOf, parseStoryState } from "@/server/account/sync";
import { authed, fail, ok, readJson } from "@/server/auth/http";

/** `GET /api/me/story` → `{values, times}`: the My Bangladesh story and when each answer changed. */
export const GET = authed((ctx) => ok(getStoryOf(ctx.user.id)));

/** `POST /api/me/story {values, times}` → `{values, times}`: newest answer wins, field by field. */
export const POST = authed(async (ctx, request) => {
  const parsed = await readJson(request, 4096);
  if (!parsed.ok) return parsed.response;
  const story = parseStoryState(parsed.body);
  if (!story) return fail(400, "bad_request", "Send {values, times}.");
  return ok(applyStory(ctx.user.id, story));
});
