import { listMyPosts } from "@/server/account/profile";
import { authed, ok } from "@/server/auth/http";

/** `GET /api/posts/mine` → `{posts}`: the signed-in user's posts with their status. */
export const GET = authed((ctx) => ok({ posts: listMyPosts(ctx.user.id) }));
