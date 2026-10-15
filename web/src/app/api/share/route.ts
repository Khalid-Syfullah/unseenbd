import { NextResponse, type NextRequest } from "next/server";
import { isDistrictId, TOTAL_DISTRICTS } from "@/lib/visited/districts";
import { MAX_NAME_LENGTH } from "@/lib/visited/encode";
import { sameOrigin } from "@/server/auth/http";
import { readTextCapped } from "@/server/body";
import { clientIp } from "@/server/rate-limit";
import { createShortLink, shortLinkLimiter } from "@/server/short-links";

const MAX_BODY = 2048;
const NO_STORE = { "Cache-Control": "no-store" };

function fail(status: 400 | 403 | 413 | 415 | 429, error: string, message: string, headers = {}) {
  return NextResponse.json({ error, message }, { status, headers: { ...NO_STORE, ...headers } });
}

/**
 * `POST /api/share {ids: number[], name?: string}` → `201 {code, path}`. Makes a short link for a
 * My Bangladesh share link (`/s/{code}` redirects to it). Stores only the district ids and the
 * name. Rate-limited per IP (`shortLinkLimiter`: 20 links an hour).
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail(403, "csrf", "Cross-site request refused.");
  const limited = shortLinkLimiter.hit(clientIp(request.headers));
  if (!limited.ok) {
    return fail(429, "rate_limited", "Too many short links. Try again later.", {
      "Retry-After": String(limited.retryAfter),
    });
  }

  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return fail(415, "unsupported_media_type", "Send JSON.");
  }
  const text = await readTextCapped(request, MAX_BODY);
  if (text === null) return fail(413, "too_large", "The body is too large.");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400, "bad_request", "The body is not JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(400, "bad_request", "Send {ids, name}.");
  }
  const { ids, name } = body as { ids?: unknown; name?: unknown };
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > TOTAL_DISTRICTS ||
    !ids.every(isDistrictId)
  ) {
    return fail(400, "bad_request", `ids must be 1–${TOTAL_DISTRICTS} district ids.`);
  }
  if (name !== undefined && name !== null && typeof name !== "string") {
    return fail(400, "bad_request", "name must be a string.");
  }
  if (typeof name === "string" && [...name].length > MAX_NAME_LENGTH * 2) {
    return fail(400, "bad_request", `name must be at most ${MAX_NAME_LENGTH} characters.`);
  }

  const link = createShortLink(ids, typeof name === "string" ? name : "");
  return NextResponse.json(
    { code: link.code, path: `/s/${link.code}`, ids: link.ids, name: link.name },
    { status: 201, headers: NO_STORE },
  );
}
