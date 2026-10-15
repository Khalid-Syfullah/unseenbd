import type { NextRequest } from "next/server";
import { csrfFailed, csrfOk, ok, readSession } from "@/server/auth/http";
import { clearSessionCookies, deleteSession } from "@/server/auth/session";

/** `POST /api/auth/logout` (with the session's CSRF token): ends the session, clears the cookies. */
export async function POST(request: NextRequest) {
  const ctx = readSession(request);
  if (ctx && !csrfOk(request, ctx)) return csrfFailed();
  if (ctx) deleteSession(ctx.token);
  const response = ok({ ok: true });
  clearSessionCookies(response.cookies);
  return response;
}
