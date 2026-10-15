import type { NextRequest } from "next/server";
import { clientIp } from "@/server/rate-limit";
import { checkLimits, ok, readSession } from "@/server/auth/http";
import { PRE_CSRF_COOKIE } from "@/server/auth/config";
import { randomToken } from "@/server/auth/crypto";
import { csrfLimiter } from "@/server/auth/limits";
import { setPreCsrfCookie } from "@/server/auth/session";

/**
 * `GET /api/auth/csrf` → `{csrfToken, signedIn}`. Signed in, the session's token. Otherwise a
 * double-submit token, also set as the httpOnly `ubd_csrf` cookie, for login and register.
 */
export async function GET(request: NextRequest) {
  const limited = checkLimits([csrfLimiter, clientIp(request.headers)]);
  if (limited) return limited;
  const ctx = readSession(request);
  if (ctx) return ok({ csrfToken: ctx.csrfToken, signedIn: true });
  const existing = request.cookies.get(PRE_CSRF_COOKIE)?.value;
  const token = existing && /^[\w-]{20,100}$/.test(existing) ? existing : randomToken();
  const response = ok({ csrfToken: token, signedIn: false });
  setPreCsrfCookie(response.cookies, token);
  return response;
}
