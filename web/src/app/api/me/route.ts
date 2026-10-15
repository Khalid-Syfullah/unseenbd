import { authed, fail, ok, readJson } from "@/server/auth/http";
import { clearSessionCookies } from "@/server/auth/session";
import { accountUser, deleteAccount, updateProfile } from "@/server/auth/users";

/** `GET /api/me` → `{user, csrfToken}` for the signed-in user (401 otherwise). */
export const GET = authed((ctx) => ok({ user: accountUser(ctx.user), csrfToken: ctx.csrfToken }));

const MESSAGES = {
  invalid_name: "Enter a name.",
  invalid_handle: "Use 3–20 lower-case letters, digits or underscores.",
  handle_taken: "That handle is taken.",
  invalid_locale: "Unknown language.",
  invalid_theme: "Unknown theme.",
} as const;

/** `PATCH /api/me {name?, handle?, locale?, theme?, publicMap?}` → `{user}`. */
export const PATCH = authed(async (ctx, request) => {
  const parsed = await readJson(request, 2048);
  if (!parsed.ok) return parsed.response;
  const { name, handle, locale, theme, publicMap } = parsed.body;
  const result = updateProfile(ctx.user.id, { name, handle, locale, theme, publicMap });
  if (!result.ok) {
    return fail(result.error === "handle_taken" ? 409 : 400, result.error, MESSAGES[result.error]);
  }
  return ok({ user: accountUser(result.user) });
});

/**
 * `DELETE /api/me {confirm}`: deletes the account and everything in it. `confirm` must be the
 * user's @handle, so it cannot happen by accident.
 */
export const DELETE = authed(async (ctx, request) => {
  const parsed = await readJson(request, 1024);
  if (!parsed.ok) return parsed.response;
  const confirm = typeof parsed.body.confirm === "string" ? parsed.body.confirm.trim() : "";
  if (confirm.replace(/^@/, "").toLowerCase() !== ctx.user.handle) {
    return fail(400, "confirm", "Type your @handle to confirm.");
  }
  deleteAccount(ctx.user.id);
  const response = ok({ deleted: true });
  clearSessionCookies(response.cookies);
  return response;
});
