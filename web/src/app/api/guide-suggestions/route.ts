import {
  EMAIL_MAX,
  isValidEmail,
  NAME_MAX,
  TIP_BODY_MAX,
  TIP_KINDS,
  type TipKind,
} from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { ok, readJson } from "@/server/auth/http";
import { community, invalid, quotaExceeded } from "@/server/community/http";
import { consumeQuota, quotaStatus } from "@/server/community/quota";
import { createGuideSuggestion, districtIdOf, placeOf } from "@/server/community/submissions";

/**
 * `POST /api/guide-suggestions {kind: tip|correction|experience|warning, place? | district?,
 * body, name?, email?}` → `201 {id}`. Private: only moderators read these (there is no public
 * GET). Five a day per IP.
 */
export const POST = community(async (visitor, request) => {
  const read = await readJson(request);
  if (!read.ok) return read.response;
  const { body } = read;
  const kind = body.kind as TipKind;
  if (!TIP_KINDS.includes(kind)) return invalid("kind");
  let placeId: number | null = null;
  let districtId: number | null = null;
  if (typeof body.place === "string" && body.place) {
    const place = placeOf(body.place);
    if (!place) return invalid("place");
    placeId = place.id;
    districtId = place.districtId;
  } else if (typeof body.district === "string" && body.district) {
    districtId = districtIdOf(body.district);
    if (!districtId) return invalid("district");
  } else {
    return invalid("place", "missing");
  }
  const text = checkText(body.body, TIP_BODY_MAX, { required: true, multiline: true });
  if (!text.ok) return invalid("body", text.reason);
  const name = checkText(body.name, NAME_MAX);
  if (!name.ok) return invalid("name", name.reason);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email && (email.length > EMAIL_MAX || !isValidEmail(email))) return invalid("email");
  if (!consumeQuota("guide", visitor.ipHash)) {
    return quotaExceeded(quotaStatus("guide", visitor.ipHash).limit);
  }
  const id = createGuideSuggestion({
    kind,
    placeId,
    districtId,
    body: text.value,
    name: name.value || null,
    email: email || null,
    userId: visitor.userId,
    ipHash: visitor.ipHash,
  });
  return ok({ id, ...quotaStatus("guide", visitor.ipHash) }, 201);
});
