// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildChoiceRounds,
  buildDuelRounds,
  buildGame,
  buildMemoryBoard,
  DUEL_MIN_GAP_KM,
  famousKey,
  uniqueFamousItems,
} from "./builders";
import { gameChallengePath, hubGameFromQuery, parseGameChallenge } from "./challenge";
import { checkPlayerName, isProfane } from "./names";
import {
  buildPersonalityRounds,
  personalityResult,
  PERSONALITY_ROUNDS,
  TRAVEL_STYLES,
  type TravelStyle,
} from "./personality";
import { bestOfRecent, parseRecords, withRound, withSubmitted } from "./records";
import {
  memoryPoints,
  replayMemory,
  resultRank,
  scoreAnswers,
  scoreChoices,
  wrongPenalty,
} from "./score";
import { addDays, createRng, dhakaDate, hashString, isIsoDate, shuffle } from "./seed";
import { CARD_SIZES, safeArea } from "@/lib/card";
import {
  LEADERBOARD_CARD_ROWS,
  LEADERBOARD_CARD_SIZES,
  leaderboardLayout,
} from "./leaderboard-card";
import { LEADERBOARD_GAMES, ROUNDS, type GameData } from "./types";

type RawDistrict = {
  id: number;
  slug: string;
  division: string;
  lat: number;
  lng: number;
  famous_for_en: string[];
};
const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "../data/districts.json"), "utf8"),
) as RawDistrict[];

const DATA: GameData = {
  districts: raw.map((d) => ({
    id: d.id,
    slug: d.slug,
    division: d.division,
    lat: d.lat,
    lng: d.lng,
    famous: d.famous_for_en.map(famousKey),
  })),
  divisions: [...new Set(raw.map((d) => d.division))].sort(),
};
const DIVISION_OF = new Map(raw.map((d) => [d.id, d.division]));
const DATE = "2026-10-15";

describe("daily seed", () => {
  it("is deterministic and differs by seed", () => {
    const a = createRng("x");
    const b = createRng("x");
    const seqA = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seqA);
    expect(createRng("y").next()).not.toBe(seqA[0]);
    expect(hashString("abc")).toBe(hashString("abc"));
    for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
  });

  it("shuffles without losing items", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(createRng(1), items).sort()).toEqual(items);
  });

  it("uses the Dhaka day (UTC+6)", () => {
    expect(dhakaDate(Date.UTC(2026, 9, 14, 17, 59))).toBe("2026-10-14");
    expect(dhakaDate(Date.UTC(2026, 9, 14, 18, 0))).toBe("2026-10-15");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-10-15")).toBe(true);
  });
});

describe("question builders", () => {
  it.each(LEADERBOARD_GAMES)("%s gives identical rounds for the same date", (game) => {
    const a = buildGame(game, DATE, DATA);
    const b = buildGame(game, DATE, {
      districts: [...DATA.districts].reverse(),
      divisions: [...DATA.divisions].reverse(),
    });
    expect(b).toEqual(a);
    expect(buildGame(game, "2026-10-16", DATA)).not.toEqual(a);
  });

  it("asks 20 distinct division questions with one right answer each", () => {
    const rounds = buildChoiceRounds("ten_question_run", DATE, DATA);
    expect(rounds).toHaveLength(ROUNDS);
    expect(new Set(rounds.map((r) => r.subject)).size).toBe(ROUNDS);
    for (const r of rounds) {
      expect(r.type).toBe("division");
      expect(r.options).toHaveLength(4);
      expect(new Set<unknown>(r.options).size).toBe(4);
      expect(r.options[r.answer]).toBe(DIVISION_OF.get(r.subject));
      expect(r.options.filter((o) => o === DIVISION_OF.get(r.subject))).toHaveLength(1);
    }
    expect(buildChoiceRounds("district_quiz", DATE, DATA)).not.toEqual(rounds);
  });

  it("builds silhouette rounds with the subject among four districts", () => {
    for (const r of buildChoiceRounds("photo_clue", DATE, DATA)) {
      expect(r.options).toHaveLength(4);
      expect(new Set<unknown>(r.options).size).toBe(4);
      expect(r.options[r.answer]).toBe(r.subject);
    }
  });

  it("only asks about famous items that belong to one district", () => {
    const unique = uniqueFamousItems(DATA);
    expect(unique.length).toBeGreaterThan(ROUNDS);
    const rounds = buildChoiceRounds("famous_quiz", DATE, DATA);
    expect(rounds).toHaveLength(ROUNDS);
    for (const r of rounds) {
      if (r.type !== "famous") throw new Error("wrong type");
      const key = DATA.districts.find((d) => d.id === r.subject)!.famous[r.item]!;
      const owners = DATA.districts.filter((d) => d.famous.includes(key));
      expect(owners.map((d) => d.id)).toEqual([r.subject]);
      expect(r.options[r.answer]).toBe(r.subject);
    }
  });

  it("orders duel districts by centroid distance with clear gaps", () => {
    const rounds = buildDuelRounds(DATE, DATA);
    expect(rounds).toHaveLength(ROUNDS);
    for (const r of rounds) {
      expect(r.districts).toHaveLength(4);
      expect(r.districts).not.toContain(r.target);
      const sorted = r.order.map((i) => r.km[i]!);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(DUEL_MIN_GAP_KM - 1);
      }
    }
  });

  it("lays out memory pairs from four different divisions", () => {
    const board = buildMemoryBoard(DATE, DATA);
    expect(board.cards).toHaveLength(8);
    const divisions = board.cards.filter((c) => c.kind === "division");
    expect(new Set(divisions.map((c) => (c.kind === "division" ? c.slug : ""))).size).toBe(4);
    for (const card of board.cards) {
      if (card.kind !== "district") continue;
      const partner = board.cards.find((c) => c.kind === "division" && c.pair === card.pair);
      expect(partner && partner.kind === "division" && partner.slug).toBe(DIVISION_OF.get(card.id));
    }
    expect(buildMemoryBoard("2026-10-16", DATA)).not.toEqual(board);
  });
});

describe("scoring", () => {
  it("scores choices: +1 right, penalty for wrong, 0 for skipped", () => {
    const rounds = buildChoiceRounds("photo_clue", DATE, DATA);
    const right = rounds.map((r) => r.answer);
    expect(scoreChoices(rounds, right)).toBe(20);
    const wrong = rounds.map((r) => (r.answer + 1) % 4);
    expect(scoreChoices(rounds, wrong, wrongPenalty("photo_clue"))).toBe(-20);
    expect(scoreChoices(rounds, wrong, wrongPenalty("ten_question_run"))).toBe(0);
    expect(
      scoreChoices(
        rounds,
        rounds.map(() => null),
      ),
    ).toBe(0);
  });

  it("re-scores answers and rejects ones that do not fit", () => {
    const rounds = buildChoiceRounds("ten_question_run", DATE, DATA);
    const answers = rounds.map((r, i) => (i < 12 ? r.answer : (r.answer + 1) % 4));
    expect(scoreAnswers("ten_question_run", DATE, DATA, answers)).toEqual({
      ok: true,
      score: 12,
      total: 20,
    });
    expect(scoreAnswers("ten_question_run", DATE, DATA, answers.slice(1)).ok).toBe(false);
    expect(scoreAnswers("ten_question_run", DATE, DATA, [...answers.slice(1), 7]).ok).toBe(false);
    expect(scoreAnswers("ten_question_run", DATE, DATA, "20").ok).toBe(false);
  });

  it("scores the duel on whole orders", () => {
    const rounds = buildDuelRounds(DATE, DATA);
    const answers = rounds.map((r, i) => (i % 2 ? r.order : [...r.order].reverse()));
    const result = scoreAnswers("distance_duel", DATE, DATA, answers);
    expect(result).toEqual({ ok: true, score: 10, total: 20 });
    expect(
      scoreAnswers(
        "distance_duel",
        DATE,
        DATA,
        rounds.map(() => [0, 0, 1, 2]),
      ).ok,
    ).toBe(false);
  });

  it("replays memory flips and scores fewer moves higher", () => {
    const board = buildMemoryBoard(DATE, DATA);
    const pairs = [0, 1, 2, 3].map((p) =>
      board.cards.map((c, i) => (c.pair === p ? i : -1)).filter((i) => i >= 0),
    );
    const perfect = pairs.flat();
    expect(replayMemory(board, perfect)).toEqual({
      ok: true,
      moves: 4,
      matched: 4,
      complete: true,
    });
    expect(scoreAnswers("memory_match", DATE, DATA, perfect)).toEqual({
      ok: true,
      score: 20,
      total: 20,
    });

    // One miss first: 5 moves.
    const miss = [pairs[0]![0]!, pairs[1]![0]!, ...perfect];
    expect(scoreAnswers("memory_match", DATE, DATA, miss)).toEqual({
      ok: true,
      score: 19,
      total: 20,
    });

    // Timer ran out after two pairs and a lone flip.
    const partial = [...pairs[0]!, ...pairs[1]!, pairs[2]![0]!];
    expect(scoreAnswers("memory_match", DATE, DATA, partial)).toEqual({
      ok: true,
      score: 4,
      total: 20,
    });

    // Flipping a matched card again, or the same card twice, is impossible.
    expect(scoreAnswers("memory_match", DATE, DATA, [...pairs[0]!, ...pairs[0]!]).ok).toBe(false);
    expect(scoreAnswers("memory_match", DATE, DATA, [3, 3]).ok).toBe(false);
    expect(scoreAnswers("memory_match", DATE, DATA, [...perfect, 0, 1]).ok).toBe(false);
  });

  it("keeps memory points monotone", () => {
    expect(memoryPoints(4, 4)).toBe(20);
    expect(memoryPoints(30, 4)).toBe(8);
    expect(memoryPoints(10, 3)).toBe(6);
    expect(memoryPoints(10, 3)).toBeLessThan(memoryPoints(40, 4));
  });

  it("gives a rank line", () => {
    expect(resultRank(20)).toBe("champion");
    expect(resultRank(14)).toBe("expert");
    expect(resultRank(9)).toBe("traveller");
    expect(resultRank(-3)).toBe("beginner");
  });
});

describe("player names", () => {
  it("accepts ordinary names in both scripts", () => {
    expect(checkPlayerName("  Rahim   Uddin ")).toEqual({ ok: true, name: "Rahim Uddin" });
    expect(checkPlayerName("রহিম")).toEqual({ ok: true, name: "রহিম" });
    expect(checkPlayerName("Scunthorpe fan").ok).toBe(true);
  });

  it("rejects bad lengths, links, symbols and swearing", () => {
    expect(checkPlayerName("R")).toEqual({ ok: false, error: "name_length" });
    expect(checkPlayerName("x".repeat(25))).toEqual({ ok: false, error: "name_length" });
    expect(checkPlayerName("!!!")).toEqual({ ok: false, error: "name_invalid" });
    expect(checkPlayerName("visit www.spam.com")).toEqual({ ok: false, error: "name_invalid" });
    expect(checkPlayerName(42)).toEqual({ ok: false, error: "name_invalid" });
    expect(checkPlayerName("f.u.c.k you")).toEqual({ ok: false, error: "name_profane" });
    expect(isProfane("SH1T")).toBe(true);
    expect(isProfane("খানকি")).toBe(true);
    expect(isProfane("Dhaka Dreamer")).toBe(false);
  });
});

describe("challenge links", () => {
  it("round-trips through the URL", () => {
    const path = gameChallengePath("en", {
      game: "ten_question_run",
      date: DATE,
      score: 14,
      name: "Rahim",
    });
    expect(path).toBe("/en/play?game=ten_question_run&date=2026-10-15&vs=14&by=Rahim");
    const q = new URL(path, "http://x").searchParams;
    expect(parseGameChallenge(q, "2026-10-16")).toEqual({
      game: "ten_question_run",
      date: DATE,
      score: 14,
      name: "Rahim",
    });
    expect(gameChallengePath("bn", { game: "famous_quiz", date: DATE, score: -2, name: "" })).toBe(
      "/quiz/famous?date=2026-10-15&vs=-2",
    );
  });

  it("ignores future dates, bad scores and other games", () => {
    const q = (s: string) => new URLSearchParams(s);
    expect(parseGameChallenge(q("game=photo_clue&date=2026-10-17&vs=3"), "2026-10-16")).toBeNull();
    expect(parseGameChallenge(q("game=photo_clue&date=2026-10-16&vs=99"), "2026-10-16")).toBeNull();
    expect(parseGameChallenge(q("date=2026-10-16&vs=3"), "2026-10-16", "famous_quiz")?.game).toBe(
      "famous_quiz",
    );
    expect(
      parseGameChallenge(q("game=photo_clue&date=2026-10-16&vs=3"), "2026-10-16", "famous_quiz"),
    ).toBeNull();
    expect(hubGameFromQuery(q("game=distance_duel"))).toBe("distance_duel");
    expect(hubGameFromQuery(q("game=nope"))).toBe("ten_question_run");
  });
});

describe("personality quiz", () => {
  const pools = Object.fromEntries(
    TRAVEL_STYLES.map((s) => [s, Array.from({ length: 8 }, (_, i) => `${s}-${i}`)]),
  ) as Record<TravelStyle, string[]>;

  it("builds six rounds with one place of each style", () => {
    const rounds = buildPersonalityRounds(DATE, pools);
    expect(rounds).toHaveLength(PERSONALITY_ROUNDS);
    for (const r of rounds) expect(r.map((o) => o.style).sort()).toEqual([...TRAVEL_STYLES].sort());
    expect(new Set(rounds.flat().map((o) => o.slug)).size).toBe(24);
    expect(buildPersonalityRounds(DATE, pools)).toEqual(rounds);
  });

  it("picks the most chosen style, the latest on a tie", () => {
    expect(personalityResult(["sea", "hills", "sea", "heritage", "sea", "hills"])).toBe("sea");
    expect(personalityResult(["sea", "hills", "hills", "sea"])).toBe("sea");
    expect(personalityResult([])).toBeNull();
  });
});

describe("personal records", () => {
  it("keeps the best score and the last five rounds", () => {
    let rec = withRound(undefined, DATE, 10);
    for (const s of [12, 8, 15, 9, 11]) rec = withRound(rec, DATE, s);
    expect(rec.best).toBe(15);
    expect(rec.recent.map((r) => r.score)).toEqual([11, 9, 15, 8, 12]);
    expect(bestOfRecent(rec)).toBe(15);
    rec = withSubmitted(rec, DATE);
    expect(withSubmitted(rec, DATE).submitted).toEqual([DATE]);
  });

  it("parses stored records defensively", () => {
    expect(parseRecords("not json")).toEqual({});
    expect(
      parseRecords(
        JSON.stringify({
          photo_clue: {
            best: 5,
            recent: [
              { date: DATE, score: 5 },
              { date: "x", score: 1 },
            ],
          },
          nope: { best: 1 },
        }),
      ),
    ).toEqual({ photo_clue: { best: 5, recent: [{ date: DATE, score: 5 }], submitted: [] } });
  });
});

describe("leaderboard card layout", () => {
  it.each(LEADERBOARD_CARD_SIZES)(
    "%s keeps every block inside the safe area without overlaps",
    (size) => {
      const safe = safeArea(CARD_SIZES[size]);
      for (const mine of [false, true]) {
        const L = leaderboardLayout(size, LEADERBOARD_CARD_ROWS[size], mine);
        const blocks = [
          L.header,
          L.title,
          L.subtitle,
          ...L.rows,
          ...(L.mine ? [L.mine] : []),
          L.footer,
        ];
        for (const b of blocks) {
          expect(b.x).toBeGreaterThanOrEqual(safe.x);
          expect(b.y).toBeGreaterThanOrEqual(safe.y - 0.5);
          expect(b.x + b.w).toBeLessThanOrEqual(safe.x + safe.w + 0.5);
          expect(b.y + b.h).toBeLessThanOrEqual(safe.y + safe.h + 0.5);
        }
        for (let i = 1; i < blocks.length; i += 1) {
          expect(blocks[i]!.y).toBeGreaterThanOrEqual(blocks[i - 1]!.y + blocks[i - 1]!.h - 0.5);
        }
        expect(L.rows).toHaveLength(LEADERBOARD_CARD_ROWS[size]);
        expect(L.rows[0]!.h).toBeGreaterThan(20);
      }
    },
  );
});
