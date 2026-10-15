import { ok } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { quotaStatus } from "@/server/community/quota";

/**
 * `GET /api/community/quota` → what this visitor can still send today: `suggestions` and
 * `comments`, plus `posts` when signed in.
 */
export const GET = community((visitor) => {
  const commentKey = visitor.userId ? `u:${visitor.userId}` : visitor.ipHash;
  return ok({
    suggestions: quotaStatus("suggestions", visitor.ipHash),
    comments: quotaStatus("comments", commentKey),
    posts: visitor.userId ? quotaStatus("posts", `u:${visitor.userId}`) : null,
  });
});
