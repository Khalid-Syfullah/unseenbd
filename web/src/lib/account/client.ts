/**
 * The visitor's account as the browser sees it: unknown (still checking), guest or signed in,
 * plus the CSRF token every mutating request needs. Components read it with `useAccount()`;
 * other modules call `whenAccountReady()` / `apiFetch()`.
 *
 * Logged-out visitors cost nothing: unless the readable `ubd_signed_in` hint cookie is set (it is
 * set at sign-in next to the httpOnly session cookie), the state goes straight to "guest" without
 * a request.
 */
import { useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/locales";
import type { ThemePref } from "@/lib/theme";

export const SIGNED_IN_HINT = "ubd_signed_in";
export const CSRF_HEADER = "X-CSRF-Token";

export type AccountUser = {
  id: number;
  name: string;
  handle: string;
  email: string | null;
  locale: Locale | null;
  theme: ThemePref | null;
  publicMap: boolean;
  hasPassword: boolean;
  google: boolean;
  role: "user" | "admin";
  createdAt: string;
};

export type AccountState =
  | { status: "unknown"; user: null; csrf: null }
  | { status: "guest"; user: null; csrf: string | null }
  | { status: "user"; user: AccountUser; csrf: string };

const UNKNOWN: AccountState = Object.freeze({ status: "unknown", user: null, csrf: null });
const GUEST: AccountState = Object.freeze({ status: "guest", user: null, csrf: null });

let state: AccountState = UNKNOWN;
const listeners = new Set<() => void>();
let readyWaiters: ((s: AccountState) => void)[] = [];

export function getAccount(): AccountState {
  return state;
}

export function setAccount(next: AccountState) {
  state = next;
  for (const listener of [...listeners]) listener();
  if (next.status !== "unknown") {
    const waiters = readyWaiters;
    readyWaiters = [];
    for (const resolve of waiters) resolve(next);
  }
}

export function setSignedIn(user: AccountUser, csrf: string) {
  setAccount({ status: "user", user, csrf });
}

export function setGuest() {
  setAccount(GUEST);
}

/** Resolves once we know whether the visitor is signed in (asking the server if needed). */
export function whenAccountReady(): Promise<AccountState> {
  if (state.status !== "unknown") return Promise.resolve(state);
  const ready = new Promise<AccountState>((resolve) => readyWaiters.push(resolve));
  void loadAccount();
  return ready;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The account in a component (`unknown` on the server and until the check finishes). */
export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, getAccount, () => UNKNOWN);
}

export function hasSignedInHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(/;\s*/).some((c) => c === `${SIGNED_IN_HINT}=1`);
}

let loading: Promise<AccountState> | null = null;

/** Asks the server who is signed in (once per page; `force` asks again). */
export function loadAccount({ force = false } = {}): Promise<AccountState> {
  if (loading && !force) return loading;
  loading = (async () => {
    if (!hasSignedInHint()) {
      setGuest();
      return state;
    }
    try {
      const res = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { user: AccountUser; csrfToken: string };
        setSignedIn(body.user, body.csrfToken);
      } else {
        setGuest();
      }
    } catch {
      // Offline: treat as a guest for now; the local stores still work.
      setGuest();
    }
    return state;
  })();
  return loading;
}

/** The CSRF token to send: the session's, or a fresh pre-sign-in token from the server. */
export async function csrfToken(): Promise<string | null> {
  const current = await whenAccountReady();
  if (current.csrf) return current.csrf;
  try {
    const res = await fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { csrfToken?: string };
    const token = body.csrfToken ?? null;
    if (token && state.status === "guest") setAccount({ status: "guest", user: null, csrf: token });
    return token;
  } catch {
    return null;
  }
}

export type ApiInit = Omit<RequestInit, "body"> & { json?: unknown; form?: FormData };

/**
 * `fetch` for this site's API: same-origin cookies, a JSON (`json`) or multipart (`form`) body,
 * and the CSRF header.
 */
export async function apiFetch(url: string, init: ApiInit = {}): Promise<Response> {
  const { json, form, headers, ...rest } = init;
  const h = new Headers(headers);
  const method = (rest.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const token = await csrfToken();
    if (token) h.set(CSRF_HEADER, token);
  }
  if (json !== undefined) h.set("Content-Type", "application/json");
  return fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...rest,
    method,
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : form,
  });
}

/** For tests: back to "unknown". */
export function resetAccountForTests() {
  state = UNKNOWN;
  loading = null;
  readyWaiters = [];
  for (const listener of [...listeners]) listener();
}
