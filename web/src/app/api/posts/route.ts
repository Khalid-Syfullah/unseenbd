import { NextResponse } from "next/server";
import { POST_BODY_MAX, POST_MAX, POST_PHOTOS_MAX } from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { idParam, ok } from "@/server/auth/http";
import {
  community,
  formText,
  imageError,
  invalid,
  quotaExceeded,
  readForm,
} from "@/server/community/http";
import { readImagePairs } from "@/server/community/media";
import { createPost } from "@/server/community/posts";
import { consumeQuota, quotaStatus, refundQuota } from "@/server/community/quota";
import { districtIdOf } from "@/server/community/submissions";
import { listPostsPage } from "@/server/data/community";
import { toLang } from "@/server/data/lang";

/** `GET /api/posts?page=&q=&lang=` → a page of approved posts, newest first. */
export const GET = community(async (_visitor, request) => {
  const params = request.nextUrl.searchParams;
  const page = await listPostsPage({
    page: idParam(params.get("page")) ?? 1,
    q: params.get("q"),
    lang: toLang(params.get("lang")),
  });
  return NextResponse.json(page, { headers: { "Cache-Control": "public, max-age=60" } });
});

/**
 * `POST /api/posts` (signed in, multipart): `body`, `district?`, up to four `photo` files each
 * with a `thumb` → `201 {id, status: "pending"}`. Five posts a day per user.
 */
export const POST = community(
  async (visitor, request) => {
    const userId = visitor.userId!;
    const read = await readForm(request, POST_BODY_MAX);
    if (!read.ok) return read.response;
    const { form } = read;
    const body = checkText(formText(form, "body"), POST_MAX, { required: true, multiline: true });
    if (!body.ok) return invalid("body", body.reason);
    const districtSlug = formText(form, "district").trim();
    const districtId = districtSlug ? districtIdOf(districtSlug) : null;
    if (districtSlug && !districtId) return invalid("district");
    const images = await readImagePairs(form, POST_PHOTOS_MAX);
    if (!images.ok) return imageError(images.status, images.reason);

    const key = `u:${userId}`;
    if (!consumeQuota("posts", key)) return quotaExceeded(quotaStatus("posts", key).limit);
    try {
      const id = createPost({ userId, body: body.value, pairs: images.pairs, districtId });
      return ok({ id, status: "pending", ...quotaStatus("posts", key) }, 201);
    } catch (error) {
      refundQuota("posts", key);
      throw error;
    }
  },
  { auth: true },
);
