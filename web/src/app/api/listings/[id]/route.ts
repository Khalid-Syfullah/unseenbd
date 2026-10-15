import { fail, idParam, ok } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { toLang } from "@/server/data/lang";
import { getListing } from "@/server/data/listings";

type Ctx = { params: Promise<{ id: string }> };

/** `GET /api/listings/:id?lang=` → the listing with prices, photos and reviews (approved only). */
export const GET = community<Ctx>(async (visitor, request, { params }) => {
  const id = idParam((await params).id);
  const viewer = visitor.session
    ? { id: visitor.session.user.id, admin: visitor.session.user.role === "admin" }
    : null;
  const listing = id
    ? await getListing(id, toLang(request.nextUrl.searchParams.get("lang")), viewer)
    : null;
  if (!listing) return fail(404, "not_found");
  return ok({ listing });
});
