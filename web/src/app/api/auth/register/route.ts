import type { NextRequest } from "next/server";
import { normalizeEmail } from "@/lib/account/rules";
import { clientIp } from "@/server/rate-limit";
import { checkLimits, csrfFailed, csrfOk, fail, readJson } from "@/server/auth/http";
import { registerLimiter } from "@/server/auth/limits";
import { signedIn } from "@/server/auth/respond";
import { registerWithPassword } from "@/server/auth/users";

const MESSAGES = {
  invalid_email: "Enter a valid email address.",
  invalid_password: "Use a password of 8 to 128 characters.",
  invalid_name: "Enter your name.",
  email_taken: "An account with this email already exists. Sign in instead.",
} as const;

/**
 * `POST /api/auth/register {email, password, name}` → `201 {user, csrfToken}` and the session
 * cookie. Needs the pre-sign-in CSRF token; 5 sign-ups per hour per IP.
 */
export async function POST(request: NextRequest) {
  const limited = checkLimits([registerLimiter, clientIp(request.headers)]);
  if (limited) return limited;
  if (!csrfOk(request, null)) return csrfFailed();
  const parsed = await readJson(request, 4096);
  if (!parsed.ok) return parsed.response;
  const { email, password, name } = parsed.body;
  const result = await registerWithPassword({ email: normalizeEmail(email), password, name });
  if (!result.ok) {
    return fail(result.error === "email_taken" ? 409 : 400, result.error, MESSAGES[result.error]);
  }
  return signedIn(result.user, 201);
}
