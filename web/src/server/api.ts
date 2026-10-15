import { NextResponse, type NextRequest } from "next/server";
import { toLang, type Lang } from "./data/lang";

/**
 * Cache policy for seeded, read-only content: browsers keep it for an hour, shared caches
 * (nginx, CDNs) for a day, and may serve a stale copy for a week while revalidating.
 */
export const STATIC_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/** JSON response for static content, with the cache header. */
export function staticJson(data: unknown, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", STATIC_CACHE);
  return NextResponse.json(data, { ...init, headers });
}

export function errorJson(status: 400 | 404, error: string, message?: string): NextResponse {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export const notFoundJson = (what = "not_found") => errorJson(404, what);
export const badRequest = (message: string) => errorJson(400, "bad_request", message);

/** Content language from `?lang=` (bn by default; interface locales read English). */
export function langOf(request: NextRequest): Lang {
  return toLang(request.nextUrl.searchParams.get("lang"));
}

/** A positive integer query parameter; `undefined` when absent, `null` when malformed. */
export function positiveInt(value: string | null): number | null | undefined {
  if (value === null || value === "") return undefined;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}

/** `1`, `true`, `yes` and `on` are true; anything else (or absence) is false. */
export function flag(value: string | null): boolean {
  return value !== null && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export type SlugContext = { params: Promise<{ slug: string }> };
