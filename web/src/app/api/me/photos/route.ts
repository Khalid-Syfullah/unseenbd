import { deleteMyPhotos, listMyPhotos } from "@/server/account/profile";
import { toLang } from "@/server/data/lang";
import { authed, ok } from "@/server/auth/http";

/** `GET /api/me/photos?lang=` → `{photos}`: everything the user uploaded, with its status. */
export const GET = authed((ctx, request) =>
  ok({ photos: listMyPhotos(ctx.user.id, toLang(request.nextUrl.searchParams.get("lang"))) }),
);

/** `DELETE /api/me/photos` → `{deleted}`: deletes all of the user's photos. */
export const DELETE = authed((ctx) => ok({ deleted: deleteMyPhotos(ctx.user.id) }));
