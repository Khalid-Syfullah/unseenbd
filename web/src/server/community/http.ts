/**
 * The wrapper for community endpoints. Most are open to everyone (uploads, likes, comments,
 * votes), so unlike `authed()` a session is optional; mutating requests still need a CSRF token:
 * the session's when signed in, otherwise the double-submit token from `GET /api/auth/csrf`.
 *
 * Visitors are identified for likes and votes by their account (`u:<id>`) or, when logged out,
 * by a random device id in the httpOnly `ubd_device` cookie, stored only as an HMAC. IP addresses
 * are only ever kept as an HMAC too (for quotas and abuse checks).
 */
import { NextResponse, type NextRequest } from "next/server";
import { secureCookies } from "../auth/config";
import { hashToken, randomToken } from "../auth/crypto";
import { checkLimits, csrfFailed, csrfOk, fail, NO_STORE, readSession } from "../auth/http";
import { setSessionCookies, type AuthContext } from "../auth/session";
import { clientIp, createRateLimiter } from "../rate-limit";
import { consumeQuota } from "./quota";

export const DEVICE_COOKIE = "ubd_device";
/** Readable hint that a device id exists, so pages only ask for "my reactions" when useful. */
export const DEVICE_HINT_COOKIE = "ubd_reacted";
const DEVICE_DAYS = 365;

/** Reads: 600 a minute per IP. Writes: 60 a minute per IP (quotas limit the day on top). */
export const communityReadLimiter = createRateLimiter({ limit: 600, windowMs: 60_000 });
export const communityWriteLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export function resetCommunityLimits() {
  communityReadLimiter.reset();
  communityWriteLimiter.reset();
}

export type Visitor = {
  /** The signed-in session, if any. */
  session: AuthContext | null;
  userId: number | null;
  /** HMAC of the client IP (never the IP itself). */
  ipHash: string;
  /**
   * The visitor's stable key for likes and votes: `u:<user id>`, or `d:<hash>` of the device
   * cookie. Null for a logged-out visitor without a device cookie until `deviceActor()` makes one.
   */
  actor: string | null;
};

export function hashIp(ip: string): string {
  return hashToken(`ip:${ip}`).slice(0, 32);
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

type Handler<C> = (
  visitor: Visitor,
  request: NextRequest,
  routeContext: C,
) => NextResponse | Promise<NextResponse>;

/**
 * Wraps a community endpoint: rate limit, optional (or `auth: true` required) session, CSRF on
 * anything but GET/HEAD, and re-sends the session cookie when the session was extended.
 */
export function community<C = unknown>(handler: Handler<C>, { auth = false } = {}) {
  return async (request: NextRequest, routeContext: C): Promise<NextResponse> => {
    const ip = clientIp(request.headers);
    const safe = SAFE.has(request.method);
    const limited = checkLimits([safe ? communityReadLimiter : communityWriteLimiter, ip]);
    if (limited) return limited;
    const session = readSession(request);
    if (auth && !session) return fail(401, "unauthorized", "Sign in first.");
    if (!safe && !csrfOk(request, session)) return csrfFailed();
    const device = request.cookies.get(DEVICE_COOKIE)?.value;
    const visitor: Visitor = {
      session,
      userId: session?.user.id ?? null,
      ipHash: hashIp(ip),
      actor: session
        ? `u:${session.user.id}`
        : device && validDeviceToken(device)
          ? `d:${hashToken(`device:${device}`).slice(0, 32)}`
          : null,
    };
    const response = await handler(visitor, request, routeContext);
    if (session?.renewed) setSessionCookies(response.cookies, session);
    return response;
  };
}

/**
 * The visitor's actor key, creating a device id for a logged-out visitor who has none. Call
 * `rememberDevice(response, token)` with the returned token so the browser keeps it.
 */
export function deviceActor(visitor: Visitor): { actor: string; newDevice: string | null } | null {
  if (visitor.actor) return { actor: visitor.actor, newDevice: null };
  // Dropping the cookie would otherwise give a fresh vote each time: new device ids are rationed
  // per IP address and day.
  if (!consumeQuota("devices", visitor.ipHash)) return null;
  const token = newDeviceToken();
  return { actor: `d:${hashToken(`device:${token}`).slice(0, 32)}`, newDevice: token };
}

/** The key for a visitor's daily quotas: the account when signed in, else the hashed IP. */
export function quotaKey(visitor: Visitor): string {
  return visitor.userId !== null ? `u:${visitor.userId}` : visitor.ipHash;
}

/**
 * Device ids are signed (`<random>.<hmac>`), so a client cannot invent a new one per request to
 * count again; only ids this server issued are accepted.
 */
function deviceSignature(random: string): string {
  return hashToken(`device-id:${random}`).slice(0, 16);
}

export function newDeviceToken(): string {
  const random = randomToken(24);
  return `${random}.${deviceSignature(random)}`;
}

export function validDeviceToken(token: string): boolean {
  const m = /^([\w-]{20,64})\.([0-9a-f]{16})$/.exec(token);
  return Boolean(m) && deviceSignature(m![1]!) === m![2];
}

export function rememberDevice(response: NextResponse, token: string | null): NextResponse {
  if (token) {
    response.cookies.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_DAYS * 24 * 60 * 60,
    });
    response.cookies.set(DEVICE_HINT_COOKIE, "1", {
      httpOnly: false,
      secure: secureCookies(),
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_DAYS * 24 * 60 * 60,
    });
  }
  return response;
}

/** 400 with the name of the field that is wrong, so forms can point at it. */
export function invalid(field: string, reason = "invalid"): NextResponse {
  return NextResponse.json({ error: "invalid", field, reason }, { status: 400, headers: NO_STORE });
}

/** 429 for a used-up daily quota, with what is left (0) and the limit. */
export function quotaExceeded(limit: number): NextResponse {
  return NextResponse.json(
    { error: "quota", limit, remaining: 0, message: "Daily limit reached. Try again tomorrow." },
    { status: 429, headers: NO_STORE },
  );
}

/**
 * Reads a multipart form of at most `maxBytes` (checked against `Content-Length` before the
 * body is read; Node stops reading at that length, and a form without one is refused), or the
 * error response to send.
 */
export async function readForm(
  request: NextRequest,
  maxBytes: number,
): Promise<{ ok: true; form: FormData } | { ok: false; response: NextResponse }> {
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!type.startsWith("multipart/form-data")) {
    return {
      ok: false,
      response: fail(415, "unsupported_media_type", "Send multipart/form-data."),
    };
  }
  // Browsers always send a length with a form; without one the body could be any size.
  const declared = request.headers.get("content-length");
  if (declared === null || !/^\d+$/.test(declared)) {
    return { ok: false, response: fail(411, "length_required", "Send a Content-Length.") };
  }
  const length = Number(declared);
  if (length > maxBytes) {
    return { ok: false, response: fail(413, "too_large", "The upload is too large.") };
  }
  try {
    return { ok: true, form: await request.formData() };
  } catch {
    return { ok: false, response: fail(400, "bad_request", "Could not read the form.") };
  }
}

/** A string field from a form (files and missing fields give ""). */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** The image-check failure as a response. */
export function imageError(status: 400 | 413 | 415, reason: string): NextResponse {
  return NextResponse.json({ error: "image", reason }, { status, headers: NO_STORE });
}
