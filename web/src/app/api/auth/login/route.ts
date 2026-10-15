import type { NextRequest } from "next/server";
import { normalizeEmail } from "@/lib/account/rules";
import { clientIp } from "@/server/rate-limit";
import { checkLimits, csrfFailed, csrfOk, fail, readJson } from "@/server/auth/http";
import { loginEmailLimiter, loginIpLimiter } from "@/server/auth/limits";
import { signedIn } from "@/server/auth/respond";
import { authenticate } from "@/server/auth/users";

/**
 * `POST /api/auth/login {email, password}` → `{user, csrfToken}` and the session cookie, or 401.
 * Needs the pre-sign-in CSRF token. Limited to 10 tries per 15 minutes per IP and per email.
 */
export async function POST(request: NextRequest) {
  if (!csrfOk(request, null)) return csrfFailed();
  const parsed = await readJson(request, 4096);
  if (!parsed.ok) return parsed.response;
  const email = normalizeEmail(parsed.body.email);
  const limited = checkLimits(
    [loginIpLimiter, clientIp(request.headers)],
    [loginEmailLimiter, email || "(none)"],
  );
  if (limited) return limited;
  const user = await authenticate(email, parsed.body.password);
  if (!user) return fail(401, "invalid_credentials", "Wrong email or password.");
  return signedIn(user);
}
