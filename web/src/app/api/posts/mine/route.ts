import { authed, ok } from "@/server/auth/http";
import { listUserPosts } from "@/server/data/community";
import { toLang } from "@/server/data/lang";

/** `GET /api/posts/mine?lang=` → `{posts}`: the signed-in user's posts with their status. */
export const GET = authed(async (ctx, request) =>
  ok({
    posts: await listUserPosts(ctx.user.id, {
      lang: toLang(request.nextUrl.searchParams.get("lang")),
    }),
  }),
);
