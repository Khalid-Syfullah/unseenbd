import { POST_COMMENT_MAX } from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { fail, idParam, ok, readJson } from "@/server/auth/http";
import { community, invalid, quotaExceeded } from "@/server/community/http";
import { addPostComment, isApprovedPost } from "@/server/community/posts";
import { consumeQuota, quotaStatus } from "@/server/community/quota";
import { listPostComments } from "@/server/data/community";

type Ctx = { params: Promise<{ id: string }> };

/** `GET /api/posts/:id/comments` → `{comments}` (approved ones, oldest first). */
export const GET = community<Ctx>(async (_visitor, _request, { params }) => {
  const id = idParam((await params).id);
  if (!id || !isApprovedPost(id)) return fail(404, "not_found");
  return ok({ comments: await listPostComments(id) });
});

/** `POST /api/posts/:id/comments {body}` (signed in) → `201 {id, status: "pending"}`. */
export const POST = community<Ctx>(
  async (visitor, request, { params }) => {
    const id = idParam((await params).id);
    if (!id || !isApprovedPost(id)) return fail(404, "not_found");
    const read = await readJson(request);
    if (!read.ok) return read.response;
    const body = checkText(read.body.body, POST_COMMENT_MAX, { required: true, multiline: true });
    if (!body.ok) return invalid("body", body.reason);
    const key = `u:${visitor.userId}`;
    if (!consumeQuota("comments", key)) return quotaExceeded(quotaStatus("comments", key).limit);
    const commentId = addPostComment({ postId: id, userId: visitor.userId!, body: body.value });
    return ok({ id: commentId, status: "pending" }, 201);
  },
  { auth: true },
);
