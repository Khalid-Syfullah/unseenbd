/**
 * Verifies a Google Identity Services credential (an ID token, a JWT signed with RS256) without a
 * client library: the signature against Google's published keys, then issuer, audience
 * (`GOOGLE_CLIENT_ID`), expiry and the email claims.
 */
import { createPublicKey, verify, type JsonWebKey } from "node:crypto";
import type { GoogleProfile } from "./users";

export const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
/** Clock skew allowed on `exp` / `iat`, seconds. */
const SKEW = 60;

export type Jwk = JsonWebKey & { kid?: string; alg?: string; kty?: string };
export type KeySource = () => Promise<Jwk[]>;

let cache: { keys: Jwk[]; until: number } | null = null;

/** Google's current signing keys, cached for as long as Google's `Cache-Control` says (≤ 1 day). */
export const googleKeys: KeySource = async () => {
  const now = Date.now();
  if (cache && cache.until > now) return cache.keys;
  const res = await fetch(GOOGLE_CERTS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Google certs: HTTP ${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  cache = { keys: body.keys ?? [], until: now + Math.min(maxAge, 86_400) * 1000 };
  return cache.keys;
};

function decodePart(part: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The profile in a valid credential for `clientId`, or null. */
export async function verifyGoogleCredential(
  credential: unknown,
  clientId: string,
  { keys = googleKeys, now = Date.now() }: { keys?: KeySource; now?: number } = {},
): Promise<GoogleProfile | null> {
  if (typeof credential !== "string" || credential.length > 4096) return null;
  const parts = credential.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];
  const header = decodePart(rawHeader);
  const payload = decodePart(rawPayload);
  if (!header || !payload || header.alg !== "RS256" || typeof header.kid !== "string") return null;

  let jwk: Jwk | undefined;
  try {
    jwk = (await keys()).find((k) => k.kid === header.kid);
  } catch {
    return null;
  }
  if (!jwk) return null;
  try {
    const key = createPublicKey({ key: jwk, format: "jwk" });
    const valid = verify(
      "RSA-SHA256",
      Buffer.from(`${rawHeader}.${rawPayload}`),
      key,
      Buffer.from(rawSignature, "base64url"),
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  const seconds = Math.floor(now / 1000);
  if (typeof payload.iss !== "string" || !ISSUERS.has(payload.iss)) return null;
  const aud = payload.aud;
  if (!(aud === clientId || (Array.isArray(aud) && aud.includes(clientId)))) return null;
  if (typeof payload.exp !== "number" || payload.exp + SKEW < seconds) return null;
  if (typeof payload.iat === "number" && payload.iat - SKEW > seconds) return null;
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255) return null;

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: typeof payload.name === "string" ? payload.name : null,
  };
}
