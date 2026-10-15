import { NextResponse, type NextRequest } from "next/server";
import { isGameKey, LEADERBOARD_GAMES } from "@/lib/games/types";
import {
  leaderboardLimiter,
  LEADERBOARD_SIZE,
  submitEntry,
  topEntries,
  type Submission,
} from "@/server/leaderboard";
import { sameOrigin } from "@/server/auth/http";
import { readTextCapped } from "@/server/body";
import { clientIp } from "@/server/rate-limit";

const MAX_BODY = 8 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

function fail(
  status: number,
  error: string,
  message: string,
  headers: Record<string, string> = {},
) {
  return NextResponse.json({ error, message }, { status, headers: { ...NO_STORE, ...headers } });
}

/**
 * `GET /api/leaderboard?game=` → `{game, entries: [{rank, name, score, total, date}]}`: the top
 * 100 approved entries (names + points only). Cached for a minute.
 */
export async function GET(request: NextRequest) {
  const game = request.nextUrl.searchParams.get("game");
  if (!isGameKey(game)) {
    return fail(400, "bad_request", `game must be one of: ${LEADERBOARD_GAMES.join(", ")}.`);
  }
  return NextResponse.json(
    { game, size: LEADERBOARD_SIZE, entries: topEntries(game) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  );
}

/**
 * `POST /api/leaderboard {game, date, name, answers, score?}` → `201 {score, total, status:
 * "pending"}`. The server re-scores `answers` against the day's seed; a `score` that does not
 * match is refused (422). The name shows only after an admin approves it. One entry per game per
 * day per visitor (409); rate-limited per IP (429).
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail(403, "csrf", "Cross-site request refused.");
  const ip = clientIp(request.headers);
  const limited = leaderboardLimiter.hit(ip);
  if (!limited.ok) {
    return fail(429, "rate_limited", "Too many scores. Try again later.", {
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
    return fail(400, "bad_request", "Send {game, date, name, answers}.");
  }

  const result = submitEntry(body as Submission, { ip });
  if (!result.ok) return fail(result.status, result.error, result.message);
  return NextResponse.json(
    {
      game: result.game,
      date: result.date,
      name: result.name,
      score: result.score,
      total: result.total,
      status: "pending",
    },
    { status: 201, headers: NO_STORE },
  );
}
