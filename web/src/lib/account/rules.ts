/**
 * Account rules shared by the browser forms and the server: what a valid email, password, name
 * and @handle look like, and where a "next" redirect may point.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 60;
export const EMAIL_MAX = 254;
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

/** Lower-case letters, digits and underscores, 3–20 characters. */
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Handles nobody can take (they look like site sections or staff). */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "api",
  "about",
  "account",
  "login",
  "logout",
  "register",
  "profile",
  "settings",
  "support",
  "help",
  "moderator",
  "staff",
  "system",
  "root",
  "null",
  "undefined",
  "unseenbd",
  "unseen_bd",
]);

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** A plain shape check (the address is never mailed, so nothing stricter is needed). */
export function isValidEmail(value: string): boolean {
  return (
    value.length >= 3 && value.length <= EMAIL_MAX && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
  );
}

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    [...value].length >= PASSWORD_MIN &&
    [...value].length <= PASSWORD_MAX
  );
}

/** A display name: no control characters or angle brackets, single spaces, at most 60 characters. */
export function cleanDisplayName(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .trim();
  return [...cleaned].slice(0, NAME_MAX).join("").trim();
}

/** Lower-cases a typed handle and drops a leading `@`. */
export function normalizeHandle(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/^@/, "").toLowerCase() : "";
}

export function isValidHandle(value: string): boolean {
  return HANDLE_PATTERN.test(value) && !RESERVED_HANDLES.has(value);
}

/**
 * Where to go after signing in: only a path on this site (`/…`, never `//host` or a URL), else
 * `fallback`.
 */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (/[\u0000-\u001f\\]/.test(value) || value.length > 512) return fallback;
  return value;
}
