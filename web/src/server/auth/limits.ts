/**
 * Rate limits on the auth endpoints (in memory, per process; see `../rate-limit.ts`). Login is
 * limited per IP and per email, so neither spraying one password over many accounts nor guessing
 * one account's password from many addresses gets far.
 */
import { createRateLimiter } from "../rate-limit";

const MINUTE = 60_000;

/** `POST /api/auth/login`: 10 tries per 15 minutes per IP. */
export const LOGIN_IP_LIMIT = 10;
export const loginIpLimiter = createRateLimiter({ limit: LOGIN_IP_LIMIT, windowMs: 15 * MINUTE });

/** `POST /api/auth/login`: 10 tries per 15 minutes per email address. */
export const LOGIN_EMAIL_LIMIT = 10;
export const loginEmailLimiter = createRateLimiter({
  limit: LOGIN_EMAIL_LIMIT,
  windowMs: 15 * MINUTE,
});

/** `POST /api/auth/register`: 5 new accounts per hour per IP. */
export const REGISTER_LIMIT = 5;
export const registerLimiter = createRateLimiter({ limit: REGISTER_LIMIT, windowMs: 60 * MINUTE });

/** `POST /api/auth/google`: 20 per 15 minutes per IP. */
export const GOOGLE_LIMIT = 20;
export const googleLimiter = createRateLimiter({ limit: GOOGLE_LIMIT, windowMs: 15 * MINUTE });

/** `GET /api/auth/csrf`: 120 per minute per IP. */
export const csrfLimiter = createRateLimiter({ limit: 120, windowMs: MINUTE });

export function resetAuthLimits() {
  for (const l of [
    loginIpLimiter,
    loginEmailLimiter,
    registerLimiter,
    googleLimiter,
    csrfLimiter,
  ]) {
    l.reset();
  }
}
