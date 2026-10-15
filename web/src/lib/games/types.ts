/**
 * Games and quizzes (FEATURES.md §5.8–5.11, `reference.json` → `games`, `quizzes`).
 *
 * The four hub games keep the keys from `reference.json`; the two scored quizzes get keys of
 * their own. All six have verified leaderboards. The personality quiz is just for fun.
 */

export const HUB_GAMES = [
  "ten_question_run",
  "photo_clue",
  "memory_match",
  "distance_duel",
] as const;
export const QUIZ_GAMES = ["district_quiz", "famous_quiz"] as const;
export const LEADERBOARD_GAMES = [...HUB_GAMES, ...QUIZ_GAMES] as const;

export type HubGame = (typeof HUB_GAMES)[number];
export type QuizGame = (typeof QUIZ_GAMES)[number];
export type GameKey = (typeof LEADERBOARD_GAMES)[number];

export function isGameKey(value: unknown): value is GameKey {
  return typeof value === "string" && (LEADERBOARD_GAMES as readonly string[]).includes(value);
}

export function isHubGame(value: unknown): value is HubGame {
  return typeof value === "string" && (HUB_GAMES as readonly string[]).includes(value);
}

/** Rounds per game; every game is scored out of 20. */
export const ROUNDS = 20;
export const MAX_SCORE = 20;

/** Memory pairs: 4 districts and their 4 divisions; 30 seconds from the first flip. */
export const MEMORY_PAIRS = 4;
export const MEMORY_SECONDS = 30;
/** Most flips a memory round can have (far more than 30 seconds allow). */
export const MEMORY_MAX_FLIPS = 80;

/** Distance duel: districts to order per round. */
export const DUEL_SIZE = 4;

/** Options per multiple-choice question. */
export const CHOICES = 4;

/* -- data the builders need (language-free, so server and browser build the same rounds) ----- */

export type GameDistrict = {
  id: number;
  slug: string;
  division: string;
  lat: number;
  lng: number;
  /** "Famous for" items as stable keys (English, normalised), same order as the display list. */
  famous: readonly string[];
};

export type GameData = {
  /** All 64 districts, sorted by id. */
  districts: readonly GameDistrict[];
  /** The 8 division slugs, sorted. */
  divisions: readonly string[];
};

/** Names for display, in the page's content language. */
export type GameLabels = {
  districts: Readonly<Record<number, string>>;
  divisions: Readonly<Record<string, string>>;
  /** "Famous for" items by district id, in the same order as `GameDistrict.famous`. */
  famous: Readonly<Record<number, readonly string[]>>;
};

/* -- rounds ------------------------------------------------------------------------------------ */

/**
 * One multiple-choice question.
 * - `division`: "Which division is {subject} in?" (options are division slugs).
 * - `silhouette`: "Which district is this?" with the subject's outline (options are district ids).
 * - `famous`: "Which district is famous for {item}?" (options are district ids).
 */
export type ChoiceRound =
  | { type: "division"; subject: number; options: string[]; answer: number }
  | { type: "silhouette"; subject: number; options: number[]; answer: number }
  | { type: "famous"; subject: number; item: number; options: number[]; answer: number };

/** One distance duel: order `districts` from nearest to farthest from `target`. */
export type DuelRound = {
  target: number;
  /** The four districts, in the order they are shown. */
  districts: number[];
  /** Straight-line km from the target to each shown district (same order). */
  km: number[];
  /** Indices into `districts`, nearest first. */
  order: number[];
};

export type MemoryCard =
  | { kind: "district"; id: number; pair: number }
  | {
      kind: "division";
      slug: string;
      pair: number;
    };

/** The memory board: 8 cards, face down, in this order. */
export type MemoryBoard = { cards: MemoryCard[] };

/* -- answers sent to the leaderboard ----------------------------------------------------------- */

/** Multiple choice: the chosen option index per question (null = no answer). */
export type ChoiceAnswers = (number | null)[];
/** Distance duel: per round, the shown indices in the order the player put them. */
export type DuelAnswers = (number[] | null)[];
/** Memory pairs: every card index flipped, in order. */
export type MemoryAnswers = number[];

export type Answers = ChoiceAnswers | DuelAnswers | MemoryAnswers;

export type ScoreResult = { ok: true; score: number; total: number } | { ok: false; error: string };

/** One row of a public leaderboard: names and points only. */
export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
  total: number;
  /** The day's set the score was made on. */
  date: string | null;
};
