import { ok } from "@/server/auth/http";
import { community, invalid } from "@/server/community/http";
import { myReactions, type TargetType } from "@/server/community/reactions";

const TYPES = new Set<TargetType>(["photo", "post", "suggestion"]);

/**
 * `GET /api/reactions?type=post&ids=1,2,3` → `{mine: {id: {like, vote, star}}}`: this visitor's
 * own likes, votes and ratings, so cached pages can show them.
 */
export const GET = community((visitor, request) => {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") as TargetType;
  if (!TYPES.has(type)) return invalid("type");
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0)
    .slice(0, 100);
  return ok({ mine: myReactions(type, ids, visitor.actor) });
});
