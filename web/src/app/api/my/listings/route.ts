import { ok } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { toLang } from "@/server/data/lang";
import { listMyListings } from "@/server/data/listings";

/** `GET /api/my/listings?lang=` (signed in) → the owner's listings in every state. */
export const GET = community(
  async (visitor, request) =>
    ok({
      listings: await listMyListings(
        visitor.userId!,
        toLang(request.nextUrl.searchParams.get("lang")),
      ),
    }),
  { auth: true },
);
