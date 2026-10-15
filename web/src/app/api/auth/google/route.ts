import type { NextRequest } from "next/server";
import { clientIp } from "@/server/rate-limit";
import { googleClientId } from "@/server/auth/config";
import { verifyGoogleCredential } from "@/server/auth/google";
import { checkLimits, csrfFailed, csrfOk, fail, readJson } from "@/server/auth/http";
import { googleLimiter } from "@/server/auth/limits";
import { signedIn } from "@/server/auth/respond";
import { signInWithGoogle } from "@/server/auth/users";

/**
 * `POST /api/auth/google {credential}`: the ID token from Google Identity Services. Verified
 * against Google's keys and `GOOGLE_CLIENT_ID`, then signs in (creating or linking the account).
 * 404 when Google sign-in is not configured.
 */
export async function POST(request: NextRequest) {
  const clientId = googleClientId();
  if (!clientId) return fail(404, "not_configured", "Google sign-in is not set up.");
  const limited = checkLimits([googleLimiter, clientIp(request.headers)]);
  if (limited) return limited;
  if (!csrfOk(request, null)) return csrfFailed();
  const parsed = await readJson(request, 8192);
  if (!parsed.ok) return parsed.response;
  const profile = await verifyGoogleCredential(parsed.body.credential, clientId);
  if (!profile) return fail(401, "invalid_credential", "Google sign-in failed. Try again.");
  try {
    return signedIn(signInWithGoogle(profile));
  } catch {
    return fail(403, "account_deleted", "This account was deleted.");
  }
}
