/**
 * Users: creating accounts (email + password, or Google), checking passwords, picking @handles,
 * editing the profile and deleting everything on request.
 */
import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { isLocale, type Locale } from "@/i18n/locales";
import {
  cleanDisplayName,
  isValidEmail,
  isValidHandle,
  isValidPassword,
  normalizeEmail,
  normalizeHandle,
  HANDLE_MAX,
} from "@/lib/account/rules";
import { isThemePref, type ThemePref } from "@/lib/theme";
import { getDb } from "../db/client";
import { photos, users } from "../db/schema";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./crypto";

export type UserRow = typeof users.$inferSelect;

/** What the browser is told about the signed-in user (never the hash or the Google id). */
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

export function accountUser(row: UserRow): AccountUser {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    email: row.email,
    locale: isLocale(row.locale) ? row.locale : null,
    theme: isThemePref(row.theme) ? row.theme : null,
    publicMap: row.publicMap,
    hasPassword: Boolean(row.passwordHash),
    google: Boolean(row.googleSub),
    role: row.role,
    createdAt: row.createdAt,
  };
}

export function getUserById(id: number): UserRow | null {
  return (
    getDb()
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .get() ?? null
  );
}

export function getUserByHandle(handle: string): UserRow | null {
  const clean = normalizeHandle(handle);
  if (!clean) return null;
  return (
    getDb()
      .select()
      .from(users)
      .where(and(eq(users.handle, clean), isNull(users.deletedAt)))
      .get() ?? null
  );
}

function handleTaken(handle: string, exceptUserId?: number): boolean {
  const row = getDb().select({ id: users.id }).from(users).where(eq(users.handle, handle)).get();
  return Boolean(row && row.id !== exceptUserId);
}

/** ASCII base for a handle: from the name, else the part of the email before `@`. */
export function handleBase(name: string, email?: string | null): string {
  const ascii = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  let base = ascii(name);
  if (base.length < 3 && email) base = ascii(email.split("@")[0] ?? "");
  if (base.length < 3) base = "traveller";
  return base.slice(0, HANDLE_MAX - 5).replace(/_+$/, "") || "traveller";
}

/** A free handle starting with `base` (adds digits when taken). */
export function uniqueHandle(base: string): string {
  if (isValidHandle(base) && !handleTaken(base)) return base;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const digits = attempt < 20 ? 2 + Math.floor(attempt / 10) : 4;
    const candidate = `${base}${randomInt(10 ** (digits - 1), 10 ** digits)}`;
    if (isValidHandle(candidate) && !handleTaken(candidate)) return candidate;
  }
  throw new Error("could not find a free handle");
}

export type RegisterResult =
  | { ok: true; user: UserRow }
  | { ok: false; error: "invalid_email" | "invalid_password" | "invalid_name" | "email_taken" };

/** Creates an email + password account (password stored as an argon2id hash). */
export async function registerWithPassword(input: {
  email: unknown;
  password: unknown;
  name: unknown;
}): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, error: "invalid_email" };
  if (!isValidPassword(input.password)) return { ok: false, error: "invalid_password" };
  const name = cleanDisplayName(input.name);
  if (!name) return { ok: false, error: "invalid_name" };

  const db = getDb();
  if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
    return { ok: false, error: "email_taken" };
  }
  const passwordHash = await hashPassword(input.password);
  try {
    const user = db
      .insert(users)
      .values({ email, passwordHash, name, handle: uniqueHandle(handleBase(name, email)) })
      .returning()
      .get();
    return { ok: true, user };
  } catch {
    // Lost a race with another sign-up for the same email.
    return { ok: false, error: "email_taken" };
  }
}

/** The user for an email + password, or null. Takes the same time whether or not the email exists. */
export async function authenticate(
  emailInput: unknown,
  password: unknown,
): Promise<UserRow | null> {
  const email = normalizeEmail(emailInput);
  if (typeof password !== "string" || !password || password.length > 1024) return null;
  const row = email
    ? getDb()
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.deletedAt)))
        .get()
    : undefined;
  if (!row?.passwordHash) return verifyAgainstDummy(password).then(() => null);
  return (await verifyPassword(row.passwordHash, password)) ? row : null;
}

export type GoogleProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

/**
 * The user for a verified Google sign-in: the account already linked to this Google id, else the
 * account with the same (Google-verified) email, which gets linked, else a new account.
 */
export function signInWithGoogle(profile: GoogleProfile): UserRow {
  const db = getDb();
  const linked = db.select().from(users).where(eq(users.googleSub, profile.sub)).get();
  if (linked) {
    if (linked.deletedAt) throw new Error("account deleted");
    return linked;
  }
  const email = profile.email && profile.emailVerified ? normalizeEmail(profile.email) : null;
  if (email) {
    const byEmail = db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .get();
    if (byEmail) {
      return db
        .update(users)
        .set({ googleSub: profile.sub, updatedAt: new Date().toISOString() })
        .where(eq(users.id, byEmail.id))
        .returning()
        .get();
    }
  }
  const name =
    cleanDisplayName(profile.name) || cleanDisplayName(email?.split("@")[0]) || "Traveller";
  return db
    .insert(users)
    .values({ email, googleSub: profile.sub, name, handle: uniqueHandle(handleBase(name, email)) })
    .returning()
    .get();
}

export type ProfilePatch = {
  name?: unknown;
  handle?: unknown;
  locale?: unknown;
  theme?: unknown;
  publicMap?: unknown;
};

export type UpdateResult =
  | { ok: true; user: UserRow }
  | {
      ok: false;
      error:
        "invalid_name" | "invalid_handle" | "handle_taken" | "invalid_locale" | "invalid_theme";
    };

/** Changes the name, @handle, language, theme or public-map switch. */
export function updateProfile(userId: number, patch: ProfilePatch): UpdateResult {
  const set: Partial<typeof users.$inferInsert> = {};
  if (patch.name !== undefined) {
    const name = cleanDisplayName(patch.name);
    if (!name) return { ok: false, error: "invalid_name" };
    set.name = name;
  }
  if (patch.handle !== undefined) {
    const handle = normalizeHandle(patch.handle);
    if (!isValidHandle(handle)) return { ok: false, error: "invalid_handle" };
    if (handleTaken(handle, userId)) return { ok: false, error: "handle_taken" };
    set.handle = handle;
  }
  if (patch.locale !== undefined) {
    if (patch.locale !== null && !isLocale(patch.locale))
      return { ok: false, error: "invalid_locale" };
    set.locale = patch.locale;
  }
  if (patch.theme !== undefined) {
    if (patch.theme !== null && !isThemePref(patch.theme))
      return { ok: false, error: "invalid_theme" };
    set.theme = patch.theme;
  }
  if (patch.publicMap !== undefined) set.publicMap = patch.publicMap === true;

  const db = getDb();
  if (!Object.keys(set).length) {
    const user = getUserById(userId);
    return user ? { ok: true, user } : { ok: false, error: "invalid_name" };
  }
  try {
    const user = db
      .update(users)
      .set({ ...set, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))
      .returning()
      .get();
    return { ok: true, user };
  } catch {
    return { ok: false, error: "handle_taken" };
  }
}

/**
 * Deletes the account and everything in it: sessions, visited districts, bucket list, world map,
 * history, trips, posts and comments go with the user row (cascades); photos are deleted
 * explicitly because they would otherwise only lose their owner.
 */
export function deleteAccount(userId: number): void {
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(photos).where(eq(photos.userId, userId)).run();
    tx.delete(users).where(eq(users.id, userId)).run();
  });
}
