import { NAME_MAX, PHOTO_COMMENT_MAX } from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { fail, idParam, ok, readJson } from "@/server/auth/http";
import { community, invalid, quotaExceeded } from "@/server/community/http";
import { addPhotoComment, isPublicPhoto } from "@/server/community/photos";
import { consumeQuota, quotaStatus } from "@/server/community/quota";
import { listPhotoComments } from "@/server/data/community";

type Ctx = { params: Promise<{ id: string }> };

/** `GET /api/photos/:id/comments` → `{comments}` (approved ones, oldest first). */
export const GET = community<Ctx>(async (_visitor, _request, { params }) => {
  const id = idParam((await params).id);
  if (!id || !isPublicPhoto(id)) return fail(404, "not_found");
  return ok({ comments: await listPhotoComments(id) });
});

/**
 * `POST /api/photos/:id/comments {name, body}` → `201 {id, status: "pending"}`. Open to
 * everyone; the body is at most 100 characters and waits for a moderator.
 */
export const POST = community<Ctx>(async (visitor, request, { params }) => {
  const id = idParam((await params).id);
  if (!id || !isPublicPhoto(id)) return fail(404, "not_found");
  const read = await readJson(request);
  if (!read.ok) return read.response;
  const name = checkText(read.body.name ?? visitor.session?.user.name, NAME_MAX, {
    required: true,
  });
  if (!name.ok) return invalid("name", name.reason);
  const body = checkText(read.body.body, PHOTO_COMMENT_MAX, { required: true, multiline: true });
  if (!body.ok) return invalid("body", body.reason);
  const key = visitor.userId ? `u:${visitor.userId}` : visitor.ipHash;
  if (!consumeQuota("comments", key)) return quotaExceeded(quotaStatus("comments", key).limit);
  const commentId = addPhotoComment({
    photoId: id,
    name: name.value,
    body: body.value,
    userId: visitor.userId,
    ipHash: visitor.ipHash,
  });
  return ok({ id: commentId, status: "pending" }, 201);
});
