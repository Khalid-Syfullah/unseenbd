import { NAME_MAX, TREND_COMMENT_MAX } from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { fail, ok, readJson } from "@/server/auth/http";
import { community, invalid, quotaExceeded } from "@/server/community/http";
import { consumeQuota, quotaStatus } from "@/server/community/quota";
import { addTrendComment, placeOf } from "@/server/community/submissions";
import { listTrendComments } from "@/server/data/community";

/** `GET /api/trend/comments?ref=slug` → `{comments}`: approved trending comments, newest first. */
export const GET = community(async (_visitor, request) => {
  const place = placeOf(request.nextUrl.searchParams.get("ref") ?? "");
  if (!place) return fail(404, "not_found");
  return ok({ comments: await listTrendComments(place.id) });
});

/** `POST /api/trend/comments {ref, name, body}` → `201 {id, status: "pending"}`. */
export const POST = community(async (visitor, request) => {
  const read = await readJson(request);
  if (!read.ok) return read.response;
  const place = placeOf(typeof read.body.ref === "string" ? read.body.ref : "");
  if (!place) return invalid("ref");
  const name = checkText(read.body.name ?? visitor.session?.user.name, NAME_MAX, {
    required: true,
  });
  if (!name.ok) return invalid("name", name.reason);
  const body = checkText(read.body.body, TREND_COMMENT_MAX, { required: true, multiline: true });
  if (!body.ok) return invalid("body", body.reason);
  const key = visitor.userId ? `u:${visitor.userId}` : visitor.ipHash;
  if (!consumeQuota("comments", key)) return quotaExceeded(quotaStatus("comments", key).limit);
  const id = addTrendComment({
    placeId: place.id,
    name: name.value,
    body: body.value,
    userId: visitor.userId,
    ipHash: visitor.ipHash,
  });
  return ok({ id, status: "pending" }, 201);
});
