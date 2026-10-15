import { NextResponse, type NextRequest } from "next/server";
import {
  CAPTION_MAX,
  EMAIL_MAX,
  isValidEmail,
  NAME_MAX,
  UPLOAD_BODY_MAX,
  UPLOAD_PHOTOS_MAX,
} from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { listGallery } from "@/server/data/community";
import { toLang } from "@/server/data/lang";
import {
  community,
  formText,
  imageError,
  invalid,
  quotaExceeded,
  readForm,
} from "@/server/community/http";
import { readImagePairs } from "@/server/community/media";
import { createPhotoBatch, resolveLocation } from "@/server/community/photos";
import { consumeQuota, quotaStatus, refundQuota } from "@/server/community/quota";
import { idParam, ok } from "@/server/auth/http";

/**
 * `GET /api/photos?page=&district=&q=&lang=` → a page of approved public photos (newest first),
 * filtered by district slug and a search over area, place and district.
 */
export const GET = community((_visitor, request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const page = idParam(params.get("page")) ?? 1;
  return listGallery({
    district: params.get("district") || null,
    q: params.get("q"),
    page,
    lang: toLang(params.get("lang")),
  }).then(({ items, total, page: current, pageCount }) =>
    NextResponse.json(
      { items, total, page: current, pageCount },
      { headers: { "Cache-Control": "public, max-age=60" } },
    ),
  );
});

/**
 * `POST /api/photos` (multipart): `name`, `email?`, `district`, `place?`, `caption?`,
 * `consent=1`, and 1–3 `photo` files each with a `thumb`. Open to everyone; two batches per day
 * per IP. The photos are stored `pending` → `201 {ids, remaining}`.
 */
export const POST = community(async (visitor, request) => {
  const read = await readForm(request, UPLOAD_BODY_MAX);
  if (!read.ok) return read.response;
  const { form } = read;

  const name = checkText(formText(form, "name"), NAME_MAX, { required: true });
  if (!name.ok) return invalid("name", name.reason);
  const email = formText(form, "email").trim();
  if (email && (email.length > EMAIL_MAX || !isValidEmail(email))) return invalid("email");
  const caption = checkText(formText(form, "caption"), CAPTION_MAX);
  if (!caption.ok) return invalid("caption", caption.reason);
  if (formText(form, "consent") !== "1") return invalid("consent", "missing");
  const location = resolveLocation(
    formText(form, "district").trim(),
    formText(form, "place").trim() || null,
  );
  if (!location) return invalid(formText(form, "place") ? "place" : "district");

  const images = await readImagePairs(form, UPLOAD_PHOTOS_MAX);
  if (!images.ok) return imageError(images.status, images.reason);
  if (!images.pairs.length) return invalid("photo", "missing");

  if (!consumeQuota("photos", visitor.ipHash))
    return quotaExceeded(quotaStatus("photos", visitor.ipHash).limit);
  let ids: number[];
  try {
    ids = createPhotoBatch({
      pairs: images.pairs,
      location,
      uploaderName: name.value,
      uploaderEmail: email || null,
      caption: caption.value || null,
      userId: visitor.userId,
      ipHash: visitor.ipHash,
    });
  } catch (error) {
    refundQuota("photos", visitor.ipHash);
    throw error;
  }
  return ok({ ids, status: "pending", ...quotaStatus("photos", visitor.ipHash) }, 201);
});
