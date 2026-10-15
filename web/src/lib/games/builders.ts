/**
 * Question builders: the rounds of every game for a given day. Pure and deterministic — the same
 * `(game, date, data)` always gives the same rounds, in the browser and on the server.
 */
import { haversineKm } from "@/lib/geo";
import { createRng, dailySeed, sample, shuffle, type Rng } from "./seed";
import {
  CHOICES,
  DUEL_SIZE,
  MEMORY_PAIRS,
  ROUNDS,
  type ChoiceRound,
  type DuelRound,
  type GameData,
  type GameDistrict,
  type GameKey,
  type MemoryBoard,
  type MemoryCard,
} from "./types";

/** A stable key for a "famous for" item: lower case letters and digits only. */
export function famousKey(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Sorted copies, so the rounds never depend on the order the data arrived in. */
function ordered(data: GameData): { districts: GameDistrict[]; divisions: string[] } {
  return {
    districts: [...data.districts].sort((a, b) => a.id - b.id),
    divisions: [...data.divisions].sort(),
  };
}

function rngFor(game: string, date: string): Rng {
  return createRng(dailySeed(game, date));
}

/** Puts `correct` among `others` at a random position; returns the options and its index. */
function withAnswer<T>(rng: Rng, correct: T, others: T[]): { options: T[]; answer: number } {
  const options = shuffle(rng, [correct, ...others]);
  return { options, answer: options.indexOf(correct) };
}

/** "Which division is {district} in?" × 20, four division options each. */
export function buildDivisionRounds(
  game: "ten_question_run" | "district_quiz",
  date: string,
  data: GameData,
): ChoiceRound[] {
  const rng = rngFor(game, date);
  const { districts, divisions } = ordered(data);
  return sample(rng, districts, ROUNDS).map((d) => {
    const others = sample(
      rng,
      divisions.filter((v) => v !== d.division),
      CHOICES - 1,
    );
    const { options, answer } = withAnswer(rng, d.division, others);
    return { type: "division", subject: d.id, options, answer };
  });
}

/** Photo clue: a district outline and four district names, × 20. */
export function buildSilhouetteRounds(date: string, data: GameData): ChoiceRound[] {
  const rng = rngFor("photo_clue", date);
  const { districts } = ordered(data);
  return sample(rng, districts, ROUNDS).map((d) => {
    const others = sample(
      rng,
      districts.filter((x) => x.id !== d.id).map((x) => x.id),
      CHOICES - 1,
    );
    const { options, answer } = withAnswer(rng, d.id, others);
    return { type: "silhouette", subject: d.id, options, answer };
  });
}

/**
 * Items that belong to exactly one district (a food listed for two districts would make a
 * question with two right answers), as `[districtId, itemIndex]`.
 */
export function uniqueFamousItems(data: GameData): [number, number][] {
  const { districts } = ordered(data);
  const owners = new Map<string, Set<number>>();
  for (const d of districts) {
    for (const key of d.famous) {
      if (!key) continue;
      const set = owners.get(key) ?? new Set<number>();
      set.add(d.id);
      owners.set(key, set);
    }
  }
  const out: [number, number][] = [];
  for (const d of districts) {
    d.famous.forEach((key, i) => {
      if (key && owners.get(key)?.size === 1) out.push([d.id, i]);
    });
  }
  return out;
}

/** "Which district is famous for {item}?" × 20, one item per district, four district options. */
export function buildFamousRounds(date: string, data: GameData): ChoiceRound[] {
  const rng = rngFor("famous_quiz", date);
  const { districts } = ordered(data);
  const byDistrict = new Map<number, number[]>();
  for (const [id, item] of uniqueFamousItems(data)) {
    byDistrict.set(id, [...(byDistrict.get(id) ?? []), item]);
  }
  const subjects = sample(rng, [...byDistrict.keys()], ROUNDS);
  return subjects.map((id) => {
    const items = byDistrict.get(id)!;
    const item = items[rng.int(items.length)]!;
    const others = sample(
      rng,
      districts.filter((x) => x.id !== id).map((x) => x.id),
      CHOICES - 1,
    );
    const { options, answer } = withAnswer(rng, id, others);
    return { type: "famous", subject: id, item, options, answer };
  });
}

/** Straight-line distance between two district centroids, in km. */
export function centroidKm(a: GameDistrict, b: GameDistrict): number {
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

/** Districts in a duel must differ by at least this much, so the order is never a coin toss. */
export const DUEL_MIN_GAP_KM = 15;

/** Distance duel: 20 targets, each with four districts to order nearest → farthest. */
export function buildDuelRounds(date: string, data: GameData): DuelRound[] {
  const rng = rngFor("distance_duel", date);
  const { districts } = ordered(data);
  const targets = sample(rng, districts, ROUNDS);
  return targets.map((target) => {
    const pool = districts.filter((d) => d.id !== target.id);
    let pick: GameDistrict[] = [];
    let dist: number[] = [];
    for (let attempt = 0; attempt < 400; attempt += 1) {
      pick = sample(rng, pool, DUEL_SIZE);
      dist = pick.map((d) => centroidKm(target, d));
      const sorted = [...dist].sort((a, b) => a - b);
      if (sorted.every((km, i) => i === 0 || km - sorted[i - 1]! >= DUEL_MIN_GAP_KM)) break;
    }
    const order = dist
      .map((km, i) => ({ km, i }))
      .sort((a, b) => a.km - b.km || a.i - b.i)
      .map((x) => x.i);
    return {
      target: target.id,
      districts: pick.map((d) => d.id),
      km: dist.map((km) => Math.round(km)),
      order,
    };
  });
}

/** Memory pairs: four districts from four different divisions, plus those divisions, shuffled. */
export function buildMemoryBoard(date: string, data: GameData): MemoryBoard {
  const rng = rngFor("memory_match", date);
  const { districts, divisions } = ordered(data);
  const usable = divisions.filter((v) => districts.some((d) => d.division === v));
  const chosen = sample(rng, usable, MEMORY_PAIRS);
  const cards: MemoryCard[] = [];
  chosen.forEach((slug, pair) => {
    const inDivision = districts.filter((d) => d.division === slug);
    const district = inDivision[rng.int(inDivision.length)]!;
    cards.push({ kind: "district", id: district.id, pair });
    cards.push({ kind: "division", slug, pair });
  });
  return { cards: shuffle(rng, cards) };
}

/** Multiple-choice rounds for the four choice games. */
export function buildChoiceRounds(
  game: "ten_question_run" | "district_quiz" | "photo_clue" | "famous_quiz",
  date: string,
  data: GameData,
): ChoiceRound[] {
  switch (game) {
    case "ten_question_run":
    case "district_quiz":
      return buildDivisionRounds(game, date, data);
    case "photo_clue":
      return buildSilhouetteRounds(date, data);
    case "famous_quiz":
      return buildFamousRounds(date, data);
  }
}

export type GameRounds =
  | {
      game: "ten_question_run" | "district_quiz" | "photo_clue" | "famous_quiz";
      rounds: ChoiceRound[];
    }
  | { game: "distance_duel"; rounds: DuelRound[] }
  | { game: "memory_match"; board: MemoryBoard };

/** Everything a game needs for one day. */
export function buildGame(game: GameKey, date: string, data: GameData): GameRounds {
  if (game === "distance_duel") return { game, rounds: buildDuelRounds(date, data) };
  if (game === "memory_match") return { game, board: buildMemoryBoard(date, data) };
  return { game, rounds: buildChoiceRounds(game, date, data) };
}
