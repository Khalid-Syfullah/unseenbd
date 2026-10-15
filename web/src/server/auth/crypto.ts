import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { sessionSecret } from "./config";

/** A random, URL-safe token (32 bytes = 256 bits by default). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** The id a session token is stored under: HMAC-SHA256 keyed with `SESSION_SECRET`. */
export function hashToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * argon2id with the OWASP baseline (19 MiB memory, 2 passes, 1 lane). The encoded hash carries
 * its own parameters, so they can be raised later without breaking old hashes.
 */
const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password.normalize("NFKC"), ARGON2);
}

export async function verifyPassword(encoded: string, password: string): Promise<boolean> {
  try {
    return await verify(encoded, password.normalize("NFKC"));
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/**
 * Spends the same time as a real check when there is no such user, so response times do not
 * reveal which emails have accounts.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword(randomToken(16));
  await verifyPassword(await dummyHash, password);
  return false;
}
