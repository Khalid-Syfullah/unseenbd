/**
 * Signing in and out in the browser.
 *
 * - `startAccount()` runs once per page (from `<AccountProvider>`): finds out who is signed in
 *   and, if someone is, starts syncing (running the sign-in merge first if this browser has not
 *   done it yet).
 * - `signInWithPassword` / `registerAccount` / `signInWithGoogleCredential` post to the auth API,
 *   then merge this browser's logged-out data into the account (`mergeLocalIntoAccount`).
 * - `signOut()` sends queued changes, ends the session and clears the local copies.
 */
import { applyThemeFromAccount } from "./theme";
import {
  apiFetch,
  getAccount,
  loadAccount,
  setGuest,
  setSignedIn,
  type AccountUser,
} from "./client";
import {
  alreadyMerged,
  alreadyMergedAnyone,
  clearLocalCopies,
  flushAccountSync,
  forgetMerged,
  installAccountSync,
  mergeLocalIntoAccount,
  MERGED_KEY,
  pullAccountSync,
} from "./sync";

export type AuthError =
  | "invalid_credentials"
  | "invalid_email"
  | "invalid_password"
  | "invalid_name"
  | "email_taken"
  | "rate_limited"
  | "invalid_credential"
  | "csrf"
  | "network"
  | "error";

export type AuthResult = { ok: true; user: AccountUser } | { ok: false; error: AuthError };

async function authRequest(url: string, json: unknown): Promise<AuthResult> {
  let res: Response;
  try {
    res = await apiFetch(url, { method: "POST", json });
  } catch {
    return { ok: false, error: "network" };
  }
  const body = (await res.json().catch(() => null)) as {
    user?: AccountUser;
    csrfToken?: string;
    error?: string;
  } | null;
  if (!res.ok || !body?.user || !body.csrfToken) {
    const known: AuthError[] = [
      "invalid_credentials",
      "invalid_email",
      "invalid_password",
      "invalid_name",
      "email_taken",
      "rate_limited",
      "invalid_credential",
      "csrf",
    ];
    const error = known.find((e) => e === body?.error) ?? "error";
    return { ok: false, error };
  }
  setSignedIn(body.user, body.csrfToken);
  forgetMerged();
  await mergeLocalIntoAccount();
  applyThemeFromAccount(body.user);
  return { ok: true, user: body.user };
}

export function signInWithPassword(email: string, password: string) {
  return authRequest("/api/auth/login", { email, password });
}

export function registerAccount(input: { name: string; email: string; password: string }) {
  return authRequest("/api/auth/register", input);
}

export function signInWithGoogleCredential(credential: string) {
  return authRequest("/api/auth/google", { credential });
}

/** Sends queued changes, ends the session, then forgets the synced stores in this browser. */
export async function signOut(): Promise<void> {
  try {
    await flushAccountSync();
  } catch {
    // signing out anyway
  }
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // offline: the cookies stay until they expire, but this browser forgets the data
  }
  forgetMerged();
  clearLocalCopies();
  setGuest();
}

let started = false;

/** Once per page load: who is signed in, then start syncing. Returns a cleanup. */
export function startAccount(): () => void {
  const onStorage = (e: StorageEvent) => {
    // Another tab signed in or out: follow it.
    if (e.key !== MERGED_KEY && e.key !== null) return;
    const was = getAccount().status;
    void loadAccount({ force: true }).then((state) => {
      if (state.status === "user") installAccountSync();
      // Signed out in another tab: this tab stops syncing (the other tab cleared the copies).
      else if (was === "user") clearLocalCopies();
    });
  };
  window.addEventListener("storage", onStorage);
  if (!started) {
    started = true;
    void loadAccount().then(async (state) => {
      if (state.status !== "user") {
        // Signed out or the session ran out: the next sign-in merges this browser's data again.
        if (alreadyMergedAnyone()) forgetMerged();
        return;
      }
      if (!alreadyMerged()) {
        await mergeLocalIntoAccount();
      } else {
        installAccountSync();
        await pullAccountSync();
      }
    });
  }
  return () => window.removeEventListener("storage", onStorage);
}

/** Updates the signed-in user in memory after the profile settings changed. */
export function updateAccountUser(user: AccountUser) {
  const current = getAccount();
  if (current.status === "user") setSignedIn(user, current.csrf);
}
