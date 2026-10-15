import { fail, idParam, ok } from "@/server/auth/http";
import { community } from "@/server/community/http";
import { myReactions } from "@/server/community/reactions";
import { getPhoto } from "@/server/data/community";
import { toLang } from "@/server/data/lang";

type Ctx = { params: Promise<{ id: string }> };

/** `GET /api/photos/:id?lang=` → `{photo, mine}` for an approved public photo, else 404. */
export const GET = community<Ctx>(async (visitor, request, { params }) => {
  const id = idParam((await params).id);
  const photo = id ? await getPhoto(id, toLang(request.nextUrl.searchParams.get("lang"))) : null;
  if (!photo) return fail(404, "not_found");
  return ok({ photo, mine: myReactions("photo", [photo.id], visitor.actor)[photo.id] });
});
