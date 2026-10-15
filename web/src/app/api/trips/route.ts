import { createTrip, listTrips } from "@/server/account/trips";
import { authed, fail, ok, readJson } from "@/server/auth/http";

/** `GET /api/trips` → `{trips}`: the signed-in user's saved trips, newest first. */
export const GET = authed((ctx) => ok({ trips: listTrips(ctx.user.id) }));

const MESSAGES = {
  invalid_input: "Send {title, input, plan, totalCost} from the planner.",
  too_large: "The plan is too large.",
  too_many: "You have saved 100 trips. Delete some to save more.",
} as const;

/** `POST /api/trips {title, input, plan, totalCost, isPublic?}` → `201 {id, path}`. */
export const POST = authed(async (ctx, request) => {
  const parsed = await readJson(request, 96 * 1024);
  if (!parsed.ok) return parsed.response;
  const result = createTrip(ctx.user.id, parsed.body);
  if (!result.ok) {
    const status = result.error === "too_large" ? 413 : result.error === "too_many" ? 409 : 400;
    return fail(status, result.error, MESSAGES[result.error]);
  }
  return ok({ id: result.trip.id, path: `/trip/${result.trip.id}` }, 201);
});
