import { POST_BODY_MAX, POST_MAX, POST_PHOTOS_MAX } from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { fail, idParam, ok } from "@/server/auth/http";
import { community, formText, imageError, invalid, readForm } from "@/server/community/http";
import { readImagePairs } from "@/server/community/media";
import { deletePost, updatePost } from "@/server/community/posts";
import { myReactions } from "@/server/community/reactions";
import { districtIdOf } from "@/server/community/submissions";
import { getPost } from "@/server/data/community";
import { toLang } from "@/server/data/lang";

type Ctx = { params: Promise<{ id: string }> };

/** `GET /api/posts/:id?lang=` → `{post, mine}`: approved posts, or the author's own. */
export const GET = community<Ctx>(async (visitor, request, { params }) => {
  const id = idParam((await params).id);
  const post = id
    ? await getPost(id, toLang(request.nextUrl.searchParams.get("lang")), visitor.userId)
    : null;
  if (!post) return fail(404, "not_found");
  return ok({ post, mine: myReactions("post", [post.id], visitor.actor)[post.id] });
});

/**
 * `PATCH /api/posts/:id` (signed in, own post, multipart): `body`, `district?`, `keep` (JSON
 * array of photo URLs to keep) and new `photo`/`thumb` pairs. The post goes back to `pending`.
 */
export const PATCH = community<Ctx>(
  async (visitor, request, { params }) => {
    const id = idParam((await params).id);
    if (!id) return fail(404, "not_found");
    const read = await readForm(request, POST_BODY_MAX);
    if (!read.ok) return read.response;
    const { form } = read;
    const body = checkText(formText(form, "body"), POST_MAX, { required: true, multiline: true });
    if (!body.ok) return invalid("body", body.reason);
    let keep: string[] = [];
    try {
      const parsed: unknown = JSON.parse(formText(form, "keep") || "[]");
      if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === "string")) throw new Error();
      keep = parsed;
    } catch {
      return invalid("keep");
    }
    const districtSlug = formText(form, "district").trim();
    const districtId = districtSlug ? districtIdOf(districtSlug) : null;
    if (districtSlug && !districtId) return invalid("district");
    const images = await readImagePairs(form, POST_PHOTOS_MAX);
    if (!images.ok) return imageError(images.status, images.reason);
    const result = updatePost(visitor.userId!, id, {
      body: body.value,
      keep,
      pairs: images.pairs,
      districtId,
    });
    if (!result.ok) {
      return result.reason === "not_found" ? fail(404, "not_found") : invalid("photo", "too_many");
    }
    return ok({ id, status: "pending" });
  },
  { auth: true },
);

/** `DELETE /api/posts/:id` (signed in, own post) → `{deleted: true}`. */
export const DELETE = community<Ctx>(
  async (visitor, _request, { params }) => {
    const id = idParam((await params).id);
    if (!id || !deletePost(visitor.userId!, id)) return fail(404, "not_found");
    return ok({ deleted: true });
  },
  { auth: true },
);
