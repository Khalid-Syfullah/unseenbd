import {
  NAME_MAX,
  SUGGESTION_BODY_MAX,
  SUGGESTION_KINDS,
  SUGGESTION_NAME_MAX,
  type SuggestionKind,
} from "@/lib/community/rules";
import { checkText } from "@/lib/community/text";
import { ok, readJson } from "@/server/auth/http";
import { community, invalid, quotaExceeded } from "@/server/community/http";
import { consumeQuota, quotaStatus } from "@/server/community/quota";
import { createSuggestion, districtIdOf } from "@/server/community/submissions";

/**
 * `POST /api/suggestions {kind: place|food|product, name, district, body?, submitter?}` →
 * `201 {id, status: "pending"}`. Open to everyone; five a day per IP. Approved suggestions show
 * on the home page (`GET /api/community/approved`).
 */
export const POST = community(async (visitor, request) => {
  const read = await readJson(request);
  if (!read.ok) return read.response;
  const { body } = read;
  const kind = body.kind as SuggestionKind;
  if (!SUGGESTION_KINDS.includes(kind)) return invalid("kind");
  const name = checkText(body.name, SUGGESTION_NAME_MAX, { required: true });
  if (!name.ok) return invalid("name", name.reason);
  const districtId = typeof body.district === "string" ? districtIdOf(body.district) : null;
  if (!districtId) return invalid("district");
  const text = checkText(body.body, SUGGESTION_BODY_MAX, { multiline: true });
  if (!text.ok) return invalid("body", text.reason);
  const submitter = checkText(body.submitter ?? visitor.session?.user.name, NAME_MAX);
  if (!submitter.ok) return invalid("submitter", submitter.reason);
  if (!consumeQuota("suggestions", visitor.ipHash)) {
    return quotaExceeded(quotaStatus("suggestions", visitor.ipHash).limit);
  }
  const id = createSuggestion({
    kind,
    name: name.value,
    districtId,
    body: text.value || null,
    submitterName: submitter.value || null,
    userId: visitor.userId,
    ipHash: visitor.ipHash,
  });
  return ok({ id, status: "pending", ...quotaStatus("suggestions", visitor.ipHash) }, 201);
});
