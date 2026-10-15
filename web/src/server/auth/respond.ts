import type { NextResponse } from "next/server";
import { ok } from "./http";
import { createSession, setSessionCookies } from "./session";
import { accountUser, type UserRow } from "./users";

/** Starts a session for `user` and answers `{user, csrfToken}` with the session cookies set. */
export function signedIn(user: UserRow, status = 200): NextResponse {
  const session = createSession(user.id);
  const response = ok({ user: accountUser(user), csrfToken: session.csrfToken }, status);
  setSessionCookies(response.cookies, session);
  return response;
}
