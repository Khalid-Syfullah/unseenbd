/**
 * Account settings, read from the environment (documented in `web/.env.example`).
 *
 * - `SESSION_SECRET`: keys the HMAC that turns a session token into the id stored in the
 *   `sessions` table, so a copy of the database alone cannot be used to sign in. Required in
 *   production; development and tests fall back to a fixed, public value.
 * - `GOOGLE_CLIENT_ID`: the OAuth client id for Google Identity Services. Without it the "Sign in
 *   with Google" button is hidden and `/api/auth/google` answers 404.
 * - `COOKIE_SECURE`: `1`/`0` forces the `Secure` cookie flag on or off. By default it is on in
 *   production and off in development (so `http://localhost` works in every browser).
 */

export const SESSION_COOKIE = "ubd_session";
/** Not secret: tells the browser code a session probably exists, so it can ask `/api/me`. */
export const SIGNED_IN_COOKIE = "ubd_signed_in";
/** Double-submit CSRF token for requests made before signing in (login, register). */
export const PRE_CSRF_COOKIE = "ubd_csrf";
export const CSRF_HEADER = "x-csrf-token";

export const SESSION_DAYS = 30;
/** A session with fewer days left than this is extended on use. */
export const SESSION_RENEW_DAYS = 15;

const DEV_SECRET = "unseenbd-development-session-secret-do-not-use-in-production";

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (at least 32 characters) in production.");
  }
  return DEV_SECRET;
}

export function secureCookies(): boolean {
  const flag = process.env.COOKIE_SECURE;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function googleClientId(): string | null {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  return id ? id : null;
}
