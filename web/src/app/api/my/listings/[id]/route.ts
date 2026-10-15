import { fail, idParam, ok } from "@/server/auth/http";
import { community, invalid } from "@/server/community/http";
import { parseListingForm } from "@/server/listings/http";
import { deleteOwnListing, updateListing } from "@/server/listings/write";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `PATCH /api/my/listings/:id` (signed in, own listing, multipart): the same fields as a new
 * listing plus `keep` (JSON array of photo URLs to keep). The listing goes back to `pending`.
 */
export const PATCH = community<Ctx>(
  async (visitor, request, { params }) => {
    const id = idParam((await params).id);
    if (!id) return fail(404, "not_found");
    const read = await parseListingForm(request);
    if (!read.ok) return read.response;
    const { input, tier, pairs, keep } = read.parsed;
    const result = updateListing(visitor.userId!, id, input, keep, pairs, tier);
    if (!result.ok) {
      if (result.reason === "not_found") return fail(404, "not_found");
      return invalid(result.reason === "district" ? "district" : "photos", result.reason);
    }
    return ok({ id, status: "pending" });
  },
  { auth: true },
);

/** `DELETE /api/my/listings/:id` (signed in, own listing) → `{ok: true}`. */
export const DELETE = community<Ctx>(
  async (visitor, _request, { params }) => {
    const id = idParam((await params).id);
    if (!id || !deleteOwnListing(visitor.userId!, id)) return fail(404, "not_found");
    return ok({ ok: true });
  },
  { auth: true },
);
