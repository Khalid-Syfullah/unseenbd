import { mergeLocalState, parseLocalState } from "@/server/account/sync";
import { authed, fail, ok, readJson } from "@/server/auth/http";

/**
 * `POST /api/me/sync {visited, bucket, world, story}`: right after signing in, the browser sends
 * what it saved while logged out. The account keeps the union of the sets and the newest story
 * answers, and answers with its full state `{visited, bucket, world, story}`, which the browser
 * adopts.
 */
export const POST = authed(async (ctx, request) => {
  const parsed = await readJson(request, 64 * 1024);
  if (!parsed.ok) return parsed.response;
  const local = parseLocalState(parsed.body);
  if (!local) return fail(400, "bad_request", "Send {visited, bucket, world, story}.");
  return ok(mergeLocalState(ctx.user.id, local));
});
