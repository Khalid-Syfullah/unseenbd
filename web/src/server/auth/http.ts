/**
 * Helpers for the account route handlers: JSON replies, reading the session from the request,
 * CSRF checks and a wrapper (`authed`) for signed-in endpoints.
 *
 * CSRF: every mutating request must send `X-CSRF-Token`. Signed in, it must equal the session's
 * token (synchroniser token, handed out by `GET /api/me` and `GET /api/auth/csrf`). Before
 * signing in (login, register, Google) it must equal the httpOnly `ubd_csrf` cookie (double
 * submit, from `GET /api/auth/csrf`). Requests the browser marks as cross-site, or whose `Origin`
 * is another host, are refused as well. Session cookies are SameSite=Lax on top of that.
 */
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, createRateLimiter, type RateLimiter } from "../rate-limit";
import { CSRF_HEADER, PRE_CSRF_COOKIE, SESSION_COOKIE } from "./config";
import { safeEqual } from "./crypto";
import { sessionFromToken, setSessionCookies, type AuthContext } from "./session";

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function fail(
  status: number,
  error: string,
  message?: string,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { ...NO_STORE, ...headers } },
  );
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function rateLimited(retryAfter: number): NextResponse {
  return fail(429, "rate_limited", "Too many requests. Try again later.", {
    "Retry-After": String(retryAfter),
  });
}

/** Counts a hit on each limiter (all of them, so one key cannot dodge another); 429 when over. */
export function checkLimits(...hits: [RateLimiter, string][]): NextResponse | null {
  let retry = 0;
  for (const [limiter, key] of hits) {
    const result = limiter.hit(key);
    if (!result.ok) retry = Math.max(retry, result.retryAfter);
  }
  return retry ? rateLimited(retry) : null;
}

export function readSession(request: NextRequest): AuthContext | null {
  return sessionFromToken(request.cookies.get(SESSION_COOKIE)?.value);
}

/** False for requests the browser says come from another site, or with a foreign `Origin`. */
export function sameOrigin(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const expected = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    request.nextUrl.host,
  ].filter((h): h is string => Boolean(h));
  return expected.some((h) => h.split(",")[0]!.trim().toLowerCase() === host.toLowerCase());
}

/** The CSRF check described above. */
export function csrfOk(request: NextRequest, ctx: AuthContext | null): boolean {
  if (!sameOrigin(request)) return false;
  const sent = request.headers.get(CSRF_HEADER);
  if (!sent) return false;
  if (ctx) return safeEqual(sent, ctx.csrfToken);
  const cookie = request.cookies.get(PRE_CSRF_COOKIE)?.value;
  return Boolean(cookie) && safeEqual(sent, cookie!);
}

export const csrfFailed = () =>
  fail(403, "csrf", "Missing or wrong CSRF token. Reload the page and try again.");

export type JsonBody = Record<string, unknown>;

/** Reads a JSON object body of at most `maxBytes`; otherwise the error response to send. */
export async function readJson(
  request: NextRequest,
  maxBytes = 16 * 1024,
): Promise<{ ok: true; body: JsonBody } | { ok: false; response: NextResponse }> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: fail(415, "unsupported_media_type", "Send JSON.") };
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    return { ok: false, response: fail(413, "too_large", "The body is too large.") };
  }
  try {
    const body: unknown = JSON.parse(text || "{}");
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return { ok: true, body: body as JsonBody };
    }
  } catch {
    // fall through
  }
  return { ok: false, response: fail(400, "bad_request", "Send a JSON object.") };
}

/** Every signed-in endpoint: 600 requests a minute per IP. */
export const accountLimiter = createRateLimiter({ limit: 600, windowMs: 60_000 });

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type Handler<C> = (
  ctx: AuthContext,
  request: NextRequest,
  routeContext: C,
) => NextResponse | Promise<NextResponse>;

/**
 * Wraps a signed-in endpoint: rate limit, 401 without a session, 403 without a valid CSRF token
 * on anything but GET/HEAD, and re-sends the session cookie when the session was extended.
 */
export function authed<C = unknown>(handler: Handler<C>) {
  return async (request: NextRequest, routeContext: C): Promise<NextResponse> => {
    const limited = checkLimits([accountLimiter, clientIp(request.headers)]);
    if (limited) return limited;
    const ctx = readSession(request);
    if (!ctx) return fail(401, "unauthorized", "Sign in first.");
    if (!SAFE_METHODS.has(request.method) && !csrfOk(request, ctx)) return csrfFailed();
    const response = await handler(ctx, request, routeContext);
    if (ctx.renewed) setSessionCookies(response.cookies, ctx);
    return response;
  };
}

/** A positive integer from a route param or query value, else null. */
export function idParam(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,12}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && Number.isSafeInteger(n) ? n : null;
}
