/**
 * Verified leaderboards (MASTER_PROMPT §5.8). A submission carries the game, the day, a name and
 * the raw answers; the server rebuilds that day's rounds from the seed and scores the answers
 * itself. A score sent by the client is never stored — if one is sent and does not match, the
 * entry is refused. Names stay hidden until an admin approves them (`approved = false`).
 */
import { createHash } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { checkPlayerName } from "@/lib/games/names";
import { scoreAnswers } from "@/lib/games/score";
import { addDays, dhakaDate, isIsoDate } from "@/lib/games/seed";
import { isGameKey, MAX_SCORE, type GameKey, type LeaderboardEntry } from "@/lib/games/types";
import { getDb } from "./db/client";
import { getGameDataSync } from "./data/games";
import { leaderboardEntries } from "./db/schema";
import { createRateLimiter } from "./rate-limit";

/** Rows returned by `GET /api/leaderboard`. */
export const LEADERBOARD_SIZE = 100;

/** `POST /api/leaderboard`: 10 submissions per IP per 10 minutes. */
export const SUBMIT_LIMIT = 10;
export const leaderboardLimiter = createRateLimiter({
  limit: SUBMIT_LIMIT,
  windowMs: 10 * 60 * 1000,
});

/** A one-way hash of the IP (salted), so duplicates can be spotted without storing addresses. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "unseenbd-leaderboard";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Days a score may be sent for: today in Dhaka and yesterday (a round that ran past midnight). */
export function submittableDates(now: Date | number = Date.now()): string[] {
  const today = dhakaDate(now);
  return [today, addDays(today, -1)];
}

export type { LeaderboardEntry };

/** The top approved entries of a game: best score first, earlier entry first on a tie. */
export function topEntries(game: GameKey, limit = LEADERBOARD_SIZE): LeaderboardEntry[] {
  return getDb()
    .select({
      name: leaderboardEntries.name,
      score: leaderboardEntries.score,
      seed: leaderboardEntries.seed,
    })
    .from(leaderboardEntries)
    .where(and(eq(leaderboardEntries.game, game), eq(leaderboardEntries.approved, true)))
    .orderBy(
      desc(leaderboardEntries.score),
      asc(leaderboardEntries.createdAt),
      asc(leaderboardEntries.id),
    )
    .limit(Math.max(1, Math.min(LEADERBOARD_SIZE, limit)))
    .all()
    .map((row, i) => ({
      rank: i + 1,
      name: row.name,
      score: row.score,
      total: MAX_SCORE,
      date: isIsoDate(row.seed) ? row.seed : null,
    }));
}

/** Approves (or hides) an entry. The admin screens (phase 15) call this. */
export function setEntryApproved(id: number, approved: boolean): boolean {
  const result = getDb()
    .update(leaderboardEntries)
    .set({ approved })
    .where(eq(leaderboardEntries.id, id))
    .run();
  return result.changes === 1;
}

export type Submission = {
  game: unknown;
  date: unknown;
  name: unknown;
  answers: unknown;
  /** A score the client claims; only compared, never stored. */
  score?: unknown;
};

export type SubmitResult =
  | {
      ok: true;
      id: number;
      game: GameKey;
      date: string;
      name: string;
      score: number;
      total: number;
    }
  | { ok: false; status: 400 | 409 | 422; error: string; message: string };

const bad = (error: string, message: string): SubmitResult => ({
  ok: false,
  status: 400,
  error,
  message,
});

/** Validates, re-scores and stores a submission (unapproved). */
export function submitEntry(
  body: Submission,
  { ip, now = Date.now() }: { ip: string; now?: Date | number },
): SubmitResult {
  const { game, date, name, answers, score: claimed } = body;
  if (!isGameKey(game)) return bad("bad_game", "Unknown game.");
  if (!isIsoDate(date)) return bad("bad_date", "date must be YYYY-MM-DD.");
  if (!submittableDates(now).includes(date)) {
    return bad("stale_date", "Scores can only be sent for today's set.");
  }
  const checked = checkPlayerName(name);
  if (!checked.ok) {
    const message =
      checked.error === "name_length"
        ? "Names are 2–24 characters."
        : checked.error === "name_profane"
          ? "Please choose another name."
          : "Names cannot contain links or only symbols.";
    return bad(checked.error, message);
  }

  const result = scoreAnswers(game, date, getGameDataSync(), answers);
  if (!result.ok)
    return bad("bad_answers", `The answers do not fit today's set (${result.error}).`);
  if (claimed !== undefined && claimed !== null && claimed !== result.score) {
    return {
      ok: false,
      status: 422,
      error: "score_mismatch",
      message: "The score does not match the answers.",
    };
  }

  const db = getDb();
  const ipHash = hashIp(ip);
  const existing = db
    .select({ id: leaderboardEntries.id })
    .from(leaderboardEntries)
    .where(
      and(
        eq(leaderboardEntries.game, game),
        eq(leaderboardEntries.seed, date),
        eq(leaderboardEntries.ipHash, ipHash),
      ),
    )
    .get();
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "already_submitted",
      message: "A score for this game was already sent today.",
    };
  }

  const inserted = db
    .insert(leaderboardEntries)
    .values({ game, name: checked.name, score: result.score, approved: false, seed: date, ipHash })
    .returning({ id: leaderboardEntries.id })
    .get();
  return {
    ok: true,
    id: inserted.id,
    game,
    date,
    name: checked.name,
    score: result.score,
    total: result.total,
  };
}
