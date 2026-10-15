import { admin } from "@/server/admin/guard";
import { logAdmin } from "@/server/admin/log";
import { listStars, setStars } from "@/server/admin/stars";
import { fail, idParam, ok, readJson } from "@/server/auth/http";

/** `GET /api/admin/stars?q=&page=` (admins only) → places with their editorial score. */
export const GET = admin((_ctx, request) => {
  const search = request.nextUrl.searchParams;
  return ok(listStars(search.get("q") ?? "", idParam(search.get("page")) ?? 1));
});

/**
 * `POST /api/admin/stars` `{slug, score: 0–10 | null}` (admins only): sets a place's editorial
 * score, or resets it to the seeded one with `null`.
 */
export const POST = admin(async (ctx, request) => {
  const read = await readJson(request, 1024);
  if (!read.ok) return read.response;
  const slug = typeof read.body.slug === "string" ? read.body.slug : "";
  const score = read.body.score === null ? null : Number(read.body.score);
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 10)) {
    return fail(400, "invalid", "score");
  }
  const result = setStars(slug, score, ctx.user.id);
  if (!result) return fail(404, "not_found");
  logAdmin(
    ctx.user.id,
    score === null ? "reset" : "stars",
    "stars",
    [slug],
    `score ${score ?? "reset"}`,
  );
  return ok(result);
});
