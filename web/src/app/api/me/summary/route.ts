import { getSummary } from "@/server/account/profile";
import { authed, ok } from "@/server/auth/http";

/** `GET /api/me/summary` → visited ids and counts of trips, photos, posts, plus total trip spend. */
export const GET = authed((ctx) => ok(getSummary(ctx.user.id)));
