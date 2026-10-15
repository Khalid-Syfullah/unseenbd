// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/leaderboard/route";
import {
  buildChoiceRounds,
  buildDuelRounds,
  buildGame,
  buildMemoryBoard,
} from "@/lib/games/builders";
import { dhakaDate } from "@/lib/games/seed";
import { getGameDataSync } from "@/server/data";
import {
  leaderboardLimiter,
  setEntryApproved,
  SUBMIT_LIMIT,
  submittableDates,
  topEntries,
} from "@/server/leaderboard";
import { getDb } from "@/server/db/client";
import { leaderboardEntries } from "@/server/db/schema";

const NOW = new Date("2026-10-15T08:00:00Z");
const TODAY = dhakaDate(NOW);

let ipCounter = 0;
function freshIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function post(body: unknown, ip = freshIp(), type = "application/json") {
  return new NextRequest(new URL("/api/leaderboard", "http://localhost"), {
    method: "POST",
    headers: { "content-type": type, "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(game: string) {
  return new NextRequest(new URL(`/api/leaderboard?game=${game}`, "http://localhost"));
}

/** Right answers for the first `right` sprint questions, wrong ones after. */
function sprintAnswers(right: number) {
  return buildChoiceRounds("ten_question_run", TODAY, getGameDataSync()).map((r, i) =>
    i < right ? r.answer : (r.answer + 1) % r.options.length,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  getDb().delete(leaderboardEntries).run();
});

afterEach(() => {
  vi.useRealTimers();
  leaderboardLimiter.reset();
});

describe("daily seed", () => {
  it("gives identical rounds for the same date, on every call", () => {
    const data = getGameDataSync();
    for (const game of [
      "ten_question_run",
      "photo_clue",
      "memory_match",
      "distance_duel",
    ] as const) {
      expect(buildGame(game, TODAY, data)).toEqual(buildGame(game, TODAY, data));
    }
    expect(buildDuelRounds(TODAY, data)).not.toEqual(buildDuelRounds("2026-10-14", data));
    expect(submittableDates(NOW)).toEqual(["2026-10-15", "2026-10-14"]);
  });
});

describe("POST /api/leaderboard", () => {
  it("re-scores the answers and stores the entry unapproved", async () => {
    const res = await POST(
      post({ game: "ten_question_run", date: TODAY, name: " Rahim ", answers: sprintAnswers(13) }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      game: "ten_question_run",
      date: TODAY,
      name: "Rahim",
      score: 13,
      total: 20,
      status: "pending",
    });
    const rows = getDb().select().from(leaderboardEntries).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ score: 13, approved: false, seed: TODAY, name: "Rahim" });
    expect(rows[0]!.ipHash).toMatch(/^[0-9a-f]{32}$/);
    // Not shown before approval.
    expect(topEntries("ten_question_run")).toEqual([]);
  });

  it("rejects a tampered score", async () => {
    const res = await POST(
      post({
        game: "ten_question_run",
        date: TODAY,
        name: "Cheater",
        answers: sprintAnswers(5),
        score: 20,
      }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("score_mismatch");
    expect(getDb().select().from(leaderboardEntries).all()).toHaveLength(0);
  });

  it("never stores the client's score, only its own", async () => {
    const res = await POST(
      post({
        game: "ten_question_run",
        date: TODAY,
        name: "Honest",
        answers: sprintAnswers(7),
        score: 7,
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).score).toBe(7);
  });

  it("rejects answers that do not fit the day's set", async () => {
    const tooFew = await POST(
      post({ game: "ten_question_run", date: TODAY, name: "Rahim", answers: [0, 1, 2] }),
    );
    expect(tooFew.status).toBe(400);
    expect((await tooFew.json()).error).toBe("bad_answers");

    const board = buildMemoryBoard(TODAY, getGameDataSync());
    const sameCard = await POST(
      post({ game: "memory_match", date: TODAY, name: "Rahim", answers: [0, 0] }),
    );
    expect(sameCard.status).toBe(400);
    expect(board.cards).toHaveLength(8);
  });

  it("only takes today's (or yesterday's) set", async () => {
    const res = await POST(
      post({ game: "photo_clue", date: "2026-10-10", name: "Rahim", answers: [] }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("stale_date");
  });

  it("validates names", async () => {
    const answers = sprintAnswers(10);
    const short = await POST(post({ game: "ten_question_run", date: TODAY, name: "A", answers }));
    expect((await short.json()).error).toBe("name_length");
    const rude = await POST(post({ game: "ten_question_run", date: TODAY, name: "shit", answers }));
    expect((await rude.json()).error).toBe("name_profane");
    const link = await POST(
      post({ game: "ten_question_run", date: TODAY, name: "go to http://x.y", answers }),
    );
    expect((await link.json()).error).toBe("name_invalid");
  });

  it("takes one entry per game per day per visitor", async () => {
    const ip = freshIp();
    const body = {
      game: "ten_question_run",
      date: TODAY,
      name: "Rahim",
      answers: sprintAnswers(9),
    };
    expect((await POST(post(body, ip))).status).toBe(201);
    const again = await POST(post(body, ip));
    expect(again.status).toBe(409);
  });

  it("refuses bad requests and rate-limits", async () => {
    expect((await POST(post("{", freshIp()))).status).toBe(400);
    expect((await POST(post({}, freshIp(), "text/plain"))).status).toBe(415);
    expect(
      (await POST(post({ game: "chess", date: TODAY, name: "Rahim", answers: [] }))).status,
    ).toBe(400);
    const ip = freshIp();
    for (let i = 0; i < SUBMIT_LIMIT; i += 1) await POST(post({ game: "nope" }, ip));
    const limited = await POST(post({ game: "nope" }, ip));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("GET /api/leaderboard", () => {
  it("returns only approved entries, best first", async () => {
    const scores = [11, 18, 15];
    for (const [i, s] of scores.entries()) {
      await POST(
        post({
          game: "ten_question_run",
          date: TODAY,
          name: `Player ${i + 1}`,
          answers: sprintAnswers(s),
        }),
      );
    }
    const rows = getDb().select().from(leaderboardEntries).all();
    for (const row of rows.filter((r) => r.score !== 15)) setEntryApproved(row.id, true);

    const res = await GET(get("ten_question_run"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: { rank: number; name: string; score: number }[] };
    expect(body.entries.map((e) => [e.rank, e.name, e.score])).toEqual([
      [1, "Player 2", 18],
      [2, "Player 1", 11],
    ]);
    expect(Object.keys(body.entries[0]!).sort()).toEqual([
      "date",
      "name",
      "rank",
      "score",
      "total",
    ]);
  });

  it("needs a known game", async () => {
    expect((await GET(get("chess"))).status).toBe(400);
  });
});
