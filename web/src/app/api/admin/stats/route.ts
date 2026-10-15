import { dhakaDay } from "@/lib/community/season";
import { admin } from "@/server/admin/guard";
import { isDay, MAX_RANGE_DAYS, statsReport } from "@/server/admin/stats";
import { fail, ok } from "@/server/auth/http";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `GET /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` (admins only; default the last 30 days,
 * at most a year) → visits per day (daily aggregates), uploads, sign-ups and the top pages.
 */
export const GET = admin((_ctx, request) => {
  const search = request.nextUrl.searchParams;
  const today = dhakaDay();
  const to = search.get("to") ?? today;
  const from =
    search.get("from") ?? dhakaDay(new Date(Date.parse(`${to}T00:00:00Z`) - 29 * DAY_MS));
  if (!isDay(from) || !isDay(to) || from > to) return fail(400, "invalid", "range");
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS >= MAX_RANGE_DAYS) {
    return fail(400, "invalid", "range");
  }
  return ok(statsReport(from, to));
});
