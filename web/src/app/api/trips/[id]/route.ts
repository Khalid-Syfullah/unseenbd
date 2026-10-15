import type { NextRequest } from "next/server";
import { deleteTrip, summarize, updateTrip, visibleTrip } from "@/server/account/trips";
import { authed, fail, idParam, ok, readJson, readSession } from "@/server/auth/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `GET /api/trips/:id` → `{trip: {…summary, input, plan, owner}}`. Shareable trips are public;
 * private ones only for their owner (404 for anyone else).
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const id = idParam((await params).id);
  if (!id) return fail(404, "not_found");
  const viewer = readSession(request);
  const trip = visibleTrip(id, viewer?.user.id ?? null);
  if (!trip) return fail(404, "not_found");
  return ok({
    trip: {
      ...summarize(trip),
      input: trip.input,
      plan: trip.plan,
      owner: trip.userId === viewer?.user.id,
    },
  });
}

/** `PATCH /api/trips/:id {title?, isPublic?}` (owner) → `{trip}`. */
export const PATCH = authed<Ctx>(async (ctx, request, { params }) => {
  const id = idParam((await params).id);
  if (!id) return fail(404, "not_found");
  const parsed = await readJson(request, 1024);
  if (!parsed.ok) return parsed.response;
  const result = updateTrip(ctx.user.id, id, {
    title: parsed.body.title,
    isPublic: parsed.body.isPublic,
  });
  if (!result.ok) return fail(404, "not_found");
  return ok({ trip: summarize(result.trip) });
});

/** `DELETE /api/trips/:id` (owner) → `{deleted: true}`. */
export const DELETE = authed<Ctx>(async (ctx, _request, { params }) => {
  const id = idParam((await params).id);
  if (!id || !deleteTrip(ctx.user.id, id)) return fail(404, "not_found");
  return ok({ deleted: true });
});
