/**
 * The wrapper for admin endpoints. Everything about `/admin` hides from anyone who is not an
 * admin: signed out, signed in as a normal user or the wrong method all answer `404`, so the
 * screens cannot be told apart from a page that does not exist. Mutating requests need the
 * session's CSRF token like every signed-in endpoint.
 */
import type { NextRequest, NextResponse } from "next/server";
import { accountLimiter, checkLimits, csrfFailed, csrfOk, fail, readSession } from "../auth/http";
import { setSessionCookies, type AuthContext } from "../auth/session";
import { clientIp } from "../rate-limit";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type Handler<C> = (
  ctx: AuthContext,
  request: NextRequest,
  routeContext: C,
) => NextResponse | Promise<NextResponse>;

export function admin<C = unknown>(handler: Handler<C>) {
  return async (request: NextRequest, routeContext: C): Promise<NextResponse> => {
    const limited = checkLimits([accountLimiter, clientIp(request.headers)]);
    if (limited) return limited;
    const ctx = readSession(request);
    if (!ctx || ctx.user.role !== "admin") return fail(404, "not_found");
    if (!SAFE_METHODS.has(request.method) && !csrfOk(request, ctx)) return csrfFailed();
    const response = await handler(ctx, request, routeContext);
    if (ctx.renewed) setSessionCookies(response.cookies, ctx);
    return response;
  };
}
