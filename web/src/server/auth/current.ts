import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./config";
import { sessionFromToken, type AuthContext } from "./session";

/**
 * The signed-in user for a server component (profile, trip, public profile pages). Reading the
 * cookie makes the page render per request. The expiry is not refreshed here (server components
 * cannot set cookies); `/api/me`, which the layout calls on every page, does that.
 */
export async function currentSession(): Promise<AuthContext | null> {
  const jar = await cookies();
  return sessionFromToken(jar.get(SESSION_COOKIE)?.value, { renew: false });
}
