/**
 * "Challenge a friend" links: the game, the day's set, the score to beat and an optional name.
 * Opening the link plays exactly the same rounds (same day seed) as the friend did.
 *
 *   /play?game=ten_question_run&date=2026-10-15&vs=14&by=Rahim
 *   /en/quiz/famous?date=2026-10-15&vs=12
 */
import { localePath, type Locale } from "@/i18n/locales";
import { cleanName, queryValue, type QueryLike } from "@/lib/visited/encode";
import { MAX_PLAYER_NAME } from "./names";
import { daysBetween, isIsoDate } from "./seed";
import { isGameKey, isHubGame, MAX_SCORE, type GameKey, type HubGame } from "./types";

/** How far back a challenge link may reach (older sets still play, they just cannot be listed). */
export const CHALLENGE_MAX_DAYS = 365;

/** A display name cut to the leaderboard length. */
export function shortName(value: unknown): string {
  return [...cleanName(value)].slice(0, MAX_PLAYER_NAME).join("").trim();
}

export type GameChallenge = { game: GameKey; date: string; score: number; name: string };

/** The page a game lives on. */
export function gamePagePath(game: GameKey): string {
  if (game === "district_quiz") return "/quiz/bangladesh";
  if (game === "famous_quiz") return "/quiz/famous";
  return "/play";
}

/** The link to a game's tab on the hub (or its quiz page). */
export function gamePath(locale: Locale, game: GameKey): string {
  const base = localePath(locale, gamePagePath(game));
  return isHubGame(game) ? `${base}?game=${game}` : base;
}

/** The challenge link for a finished round. */
export function gameChallengePath(locale: Locale, c: GameChallenge): string {
  const q = new URLSearchParams();
  if (isHubGame(c.game)) q.set("game", c.game);
  q.set("date", c.date);
  q.set("vs", String(Math.round(c.score)));
  const name = shortName(c.name);
  if (name) q.set("by", name);
  return `${localePath(locale, gamePagePath(c.game))}?${q.toString()}`;
}

/**
 * Reads a challenge from the query. `game` is the page's game when the link has none (quiz
 * pages). Dates after `today` or more than a year old are ignored, as are malformed scores.
 */
export function parseGameChallenge(
  query: QueryLike,
  today: string,
  pageGame?: GameKey,
): GameChallenge | null {
  const game = queryValue(query, "game") ?? pageGame ?? null;
  const date = queryValue(query, "date");
  const vs = queryValue(query, "vs");
  if (!isGameKey(game) || (pageGame && game !== pageGame) || !isIsoDate(date) || vs === null) {
    return null;
  }
  const age = daysBetween(date, today);
  if (age < 0 || age > CHALLENGE_MAX_DAYS) return null;
  if (!/^-?\d{1,2}$/.test(vs)) return null;
  const score = Number(vs);
  if (Math.abs(score) > MAX_SCORE) return null;
  const name = shortName(queryValue(query, "by"));
  return { game, date, score, name };
}

/** The hub tab from `?game=` (the first game when absent or unknown). */
export function hubGameFromQuery(query: QueryLike): HubGame {
  const game = queryValue(query, "game");
  return isHubGame(game) ? game : "ten_question_run";
}
