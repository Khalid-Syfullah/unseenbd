/**
 * Server sessions. The browser holds a random token in an httpOnly, SameSite=Lax cookie
 * (`Secure` in production); the `sessions` table stores only the token's HMAC, the user, a CSRF
 * token and the expiry. Sessions last 30 days and are extended when used in their second half.
 */
import { eq, lt } from "drizzle-orm";
import { getDb } from "../db/client";
import { sessions } from "../db/schema";
import {
  PRE_CSRF_COOKIE,
  secureCookies,
  SESSION_COOKIE,
  SESSION_DAYS,
  SESSION_RENEW_DAYS,
  SIGNED_IN_COOKIE,
} from "./config";
import { hashToken, randomToken } from "./crypto";
import { getUserById, type UserRow } from "./users";

const DAY = 24 * 60 * 60 * 1000;

export type Session = {
  token: string;
  csrfToken: string;
  expiresAt: Date;
};

export type AuthContext = {
  user: UserRow;
  token: string;
  csrfToken: string;
  expiresAt: Date;
  /** The expiry moved forward on this request: the cookie must be sent again. */
  renewed: boolean;
};

export function createSession(userId: number, now = new Date()): Session {
  const token = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY);
  const db = getDb();
  // Housekeeping: forget sessions that have run out.
  db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString())).run();
  db.insert(sessions)
    .values({ id: hashToken(token), userId, csrfToken, expiresAt: expiresAt.toISOString() })
    .run();
  return { token, csrfToken, expiresAt };
}

/** The signed-in user for a session token, or null (unknown, expired or deleted account). */
export function sessionFromToken(
  token: string | null | undefined,
  { now = new Date(), renew = true }: { now?: Date; renew?: boolean } = {},
): AuthContext | null {
  if (!token || token.length > 200) return null;
  const db = getDb();
  const id = hashToken(token);
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row) return null;
  let expiresAt = new Date(row.expiresAt);
  if (!(expiresAt.getTime() > now.getTime())) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  const user = getUserById(row.userId);
  if (!user) return null;
  let renewed = false;
  if (renew && expiresAt.getTime() - now.getTime() < SESSION_RENEW_DAYS * DAY) {
    expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY);
    db.update(sessions)
      .set({ expiresAt: expiresAt.toISOString() })
      .where(eq(sessions.id, id))
      .run();
    renewed = true;
  }
  return { user, token, csrfToken: row.csrfToken, expiresAt, renewed };
}

export function deleteSession(token: string): void {
  getDb()
    .delete(sessions)
    .where(eq(sessions.id, hashToken(token)))
    .run();
}

export function deleteUserSessions(userId: number): void {
  getDb().delete(sessions).where(eq(sessions.userId, userId)).run();
}

/* -- cookies ---------------------------------------------------------------------------------- */

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  expires?: Date;
  maxAge?: number;
};

type CookieJar = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

/** Sets the session cookie (httpOnly) and the readable "signed in" hint. */
export function setSessionCookies(jar: CookieJar, session: { token: string; expiresAt: Date }) {
  const secure = secureCookies();
  jar.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  jar.set(SIGNED_IN_COOKIE, "1", {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  jar.set(PRE_CSRF_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

export function clearSessionCookies(jar: CookieJar) {
  const secure = secureCookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  jar.set(SIGNED_IN_COOKIE, "", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

/** The pre-sign-in CSRF cookie (double submit): httpOnly, lives for two hours. */
export function setPreCsrfCookie(jar: CookieJar, token: string) {
  jar.set(PRE_CSRF_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60,
  });
}
