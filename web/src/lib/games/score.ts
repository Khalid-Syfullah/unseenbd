/**
 * Scoring. The browser uses it to show the result; the leaderboard API uses it to re-score the
 * submitted answers against the day's rounds, so a score typed into a request is never trusted.
 */
import { buildGame } from "./builders";
import {
  DUEL_SIZE,
  MAX_SCORE,
  MEMORY_MAX_FLIPS,
  MEMORY_PAIRS,
  ROUNDS,
  type ChoiceRound,
  type DuelRound,
  type GameData,
  type GameKey,
  type MemoryBoard,
  type ScoreResult,
} from "./types";

/** Photo clue is +1 for right and −1 for wrong; the others are +1 for right, 0 for wrong. */
export function wrongPenalty(game: GameKey): number {
  return game === "photo_clue" ? -1 : 0;
}

const isIndex = (v: unknown, n: number): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;

/** Points for multiple-choice answers (null = skipped, scores 0). */
export function scoreChoices(
  rounds: readonly ChoiceRound[],
  answers: readonly (number | null)[],
  penalty = 0,
): number {
  let score = 0;
  rounds.forEach((round, i) => {
    const a = answers[i];
    if (a === null || a === undefined) return;
    score += a === round.answer ? 1 : penalty;
  });
  return score;
}

/** True when `value` is a permutation of 0…n−1. */
export function isPermutation(value: unknown, n: number): value is number[] {
  if (!Array.isArray(value) || value.length !== n) return false;
  const seen = new Set<number>();
  for (const v of value) {
    if (!isIndex(v, n) || seen.has(v)) return false;
    seen.add(v);
  }
  return true;
}

/** A duel round is right only when the whole order is right. */
export function duelCorrect(
  round: DuelRound,
  answer: readonly number[] | null | undefined,
): boolean {
  return (
    !!answer && answer.length === round.order.length && answer.every((v, i) => v === round.order[i])
  );
}

export function scoreDuels(
  rounds: readonly DuelRound[],
  answers: readonly (number[] | null)[],
): number {
  return rounds.reduce((sum, round, i) => sum + (duelCorrect(round, answers[i]) ? 1 : 0), 0);
}

export type MemoryReplay =
  { ok: true; moves: number; matched: number; complete: boolean } | { ok: false; error: string };

/**
 * Plays the flips on the board: every two flips are one move; a move that turns up a district and
 * its division is a match. Flipping a matched card, the same card twice, or carrying on after
 * the board is cleared is invalid. A single last flip (the timer ran out) is ignored.
 */
export function replayMemory(board: MemoryBoard, flips: readonly unknown[]): MemoryReplay {
  const n = board.cards.length;
  if (flips.length > MEMORY_MAX_FLIPS) return { ok: false, error: "too_many_flips" };
  const matched = new Set<number>();
  let moves = 0;
  for (let i = 0; i + 1 < flips.length; i += 2) {
    const a = flips[i];
    const b = flips[i + 1];
    if (!isIndex(a, n) || !isIndex(b, n) || a === b) return { ok: false, error: "bad_flip" };
    if (matched.has(a) || matched.has(b)) return { ok: false, error: "bad_flip" };
    if (matched.size === n) return { ok: false, error: "bad_flip" };
    moves += 1;
    const ca = board.cards[a]!;
    const cb = board.cards[b]!;
    if (ca.pair === cb.pair && ca.kind !== cb.kind) {
      matched.add(a);
      matched.add(b);
    }
  }
  if (flips.length % 2 === 1) {
    const last = flips[flips.length - 1];
    if (!isIndex(last, n) || matched.has(last) || matched.size === n) {
      return { ok: false, error: "bad_flip" };
    }
  }
  const pairs = matched.size / 2;
  return { ok: true, moves, matched: pairs, complete: pairs === MEMORY_PAIRS };
}

/**
 * Memory points out of 20: a cleared board scores 20 at the perfect 4 moves, one less for every
 * extra move, never below 8; an unfinished board scores 2 per pair (at most 6). So fewer moves
 * always wins, and finishing always beats running out of time.
 */
export function memoryPoints(moves: number, pairs: number): number {
  if (pairs >= MEMORY_PAIRS)
    return Math.max(8, Math.min(MAX_SCORE, MAX_SCORE - (moves - MEMORY_PAIRS)));
  return Math.max(0, pairs) * 2;
}

/**
 * Re-scores submitted answers for `game` on `date`. Answers that do not fit the day's rounds
 * (wrong length, bad indices, impossible flips) are rejected, not scored.
 */
export function scoreAnswers(
  game: GameKey,
  date: string,
  data: GameData,
  answers: unknown,
): ScoreResult {
  if (!Array.isArray(answers)) return { ok: false, error: "answers_not_array" };
  const built = buildGame(game, date, data);

  if (built.game === "memory_match") {
    const replay = replayMemory(built.board, answers);
    if (!replay.ok) return replay;
    return { ok: true, score: memoryPoints(replay.moves, replay.matched), total: MAX_SCORE };
  }

  if (answers.length !== ROUNDS || built.rounds.length !== ROUNDS) {
    return { ok: false, error: "wrong_length" };
  }

  if (built.game === "distance_duel") {
    for (const a of answers) {
      if (a !== null && !isPermutation(a, DUEL_SIZE)) return { ok: false, error: "bad_answer" };
    }
    return {
      ok: true,
      score: scoreDuels(built.rounds, answers as (number[] | null)[]),
      total: MAX_SCORE,
    };
  }

  const rounds = built.rounds;
  for (let i = 0; i < answers.length; i += 1) {
    const a: unknown = answers[i];
    if (a !== null && !isIndex(a, rounds[i]!.options.length))
      return { ok: false, error: "bad_answer" };
  }
  return {
    ok: true,
    score: scoreChoices(rounds, answers as (number | null)[], wrongPenalty(game)),
    total: MAX_SCORE,
  };
}

export const RESULT_RANKS = ["champion", "expert", "traveller", "beginner"] as const;
export type ResultRank = (typeof RESULT_RANKS)[number];

/** The rank line on the result screen, from the score out of 20. */
export function resultRank(score: number): ResultRank {
  if (score >= 18) return "champion";
  if (score >= 14) return "expert";
  if (score >= 9) return "traveller";
  return "beginner";
}
