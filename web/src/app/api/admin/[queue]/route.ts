import { admin } from "@/server/admin/guard";
import { logAdmin } from "@/server/admin/log";
import {
  QUEUE_ACTIONS,
  QUEUE_PAGE_SIZE as PAGE_SIZE,
  QUEUE_STATUSES,
  queueByName,
  type QueueAction,
  type QueueStatus,
} from "@/server/admin/queues";
import { fail, idParam, ok, readJson } from "@/server/auth/http";

type Ctx = { params: Promise<{ queue: string }> };

/**
 * `GET /api/admin/:queue?status=pending|approved|rejected&page=` (admins only) → one page of a
 * moderation queue. Queues: photos, posts (alias `community`), comments, suggestions,
 * guide-suggestions, listings, listing-reviews, reports, leaderboard.
 */
export const GET = admin<Ctx>(async (_ctx, request, { params }) => {
  const found = queueByName((await params).queue);
  if (!found) return fail(404, "not_found");
  const search = request.nextUrl.searchParams;
  const status = (search.get("status") ?? "pending") as QueueStatus;
  if (!QUEUE_STATUSES.includes(status)) return fail(400, "invalid", "status");
  const page = idParam(search.get("page")) ?? 1;
  const { items, total } = found.queue.list(status, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return ok({
    queue: found.name,
    label: found.queue.label,
    actions: found.queue.actions,
    status,
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});

/**
 * `POST /api/admin/:queue` `{ids: string[], action}` (admins only): applies the action to up to
 * 200 items at once → `{changed}`. Every call is written to the admin log.
 */
export const POST = admin<Ctx>(async (ctx, request, { params }) => {
  const found = queueByName((await params).queue);
  if (!found) return fail(404, "not_found");
  const read = await readJson(request, 32 * 1024);
  if (!read.ok) return read.response;
  const action = read.body.action as QueueAction;
  const ids = read.body.ids;
  if (!QUEUE_ACTIONS.includes(action) || !(action in found.queue.actions)) {
    return fail(400, "invalid", "action");
  }
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    !ids.every((i) => typeof i === "string" || typeof i === "number")
  ) {
    return fail(400, "invalid", "ids");
  }
  const list = ids.map(String);
  const changed = found.queue.act(list, action);
  logAdmin(ctx.user.id, action, found.name, list.slice(0, 200), `${changed} changed`);
  return ok({ changed });
});
