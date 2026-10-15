import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayPage from "@/app/[lang]/play/page";
import FamousQuizPage from "@/app/[lang]/quiz/famous/page";
import PersonalityPage from "@/app/[lang]/quiz/personality/page";
import type { Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { buildChoiceRounds, buildDuelRounds, buildMemoryBoard } from "@/lib/games/builders";
import { RECORDS_KEY } from "@/lib/games/records";
import { dhakaDate } from "@/lib/games/seed";
import { getGameData, getGameDataSync } from "@/server/data";
import { getDb } from "@/server/db/client";
import { leaderboardEntries } from "@/server/db/schema";
import { setEntryApproved, submitEntry } from "@/server/leaderboard";
import { renderWithI18n } from "./i18n";

const en = getT("en");
const bn = getT("bn");

async function showPlay(lang: Locale, query: Record<string, string> = {}) {
  const ui = await PlayPage({
    params: Promise.resolve({ lang }),
    searchParams: Promise.resolve(query),
  });
  return renderWithI18n(ui, { locale: lang });
}

beforeEach(() => {
  window.localStorage.clear();
  getDb().delete(leaderboardEntries).run();
});
afterEach(() => vi.restoreAllMocks());

describe("/play", () => {
  it("renders the hub with four tabs, the sprint first, and switches tabs", async () => {
    await showPlay("en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("games.title"));
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      en("games.names.ten_question_run"),
      en("games.names.photo_clue"),
      en("games.names.memory_match"),
      en("games.names.distance_duel"),
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(tabs[1]!);
    expect(screen.getByRole("tab", { name: en("games.names.photo_clue") })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("img", { name: en("games.silhouetteAlt") })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /More to try/ })).toBeInTheDocument();
  });

  it("plays the sprint to 20/20, records it and sends the answers for re-scoring", async () => {
    const today = dhakaDate();
    const { labels } = await getGameData("en");
    const rounds = buildChoiceRounds("ten_question_run", today, getGameDataSync());
    await showPlay("en");
    const panel = screen.getByRole("tabpanel");

    rounds.forEach((round, i) => {
      const district = labels.districts[round.subject]!;
      expect(
        within(panel).getByText(en("games.question.division", { district })),
      ).toBeInTheDocument();
      const answer = labels.divisions[round.options[round.answer] as string]!;
      fireEvent.click(within(panel).getByRole("button", { name: answer }));
      // Never colour alone: the right answer carries an icon and a word.
      expect(
        within(panel).getByRole("button", { name: `${answer}, ${en("games.correct")}` }),
      ).toBeDisabled();
      expect(within(panel).getByText(en("games.feedbackRight"))).toBeInTheDocument();
      fireEvent.click(
        within(panel).getByRole("button", {
          name: i === 19 ? en("games.finish") : en("games.next"),
        }),
      );
    });

    expect(within(panel).getByText("20 / 20")).toBeInTheDocument();
    expect(within(panel).getByText(en("games.result.ranks.champion"))).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(RECORDS_KEY)!);
    expect(stored.ten_question_run.best).toBe(20);

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ score: 20, total: 20, status: "pending" }), { status: 201 }),
      );
    fireEvent.change(within(panel).getByLabelText(en("games.submit.name")), {
      target: { value: "Rahim" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: en("games.submit.send") }));
    expect(
      await within(panel).findByText(en("games.submit.sent", { score: 20 })),
    ).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/leaderboard");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toMatchObject({ game: "ten_question_run", date: today, name: "Rahim", score: 20 });
    expect(body.answers).toEqual(rounds.map((r) => r.answer));
    // The same answers pass the server's own check.
    expect(submitEntry(body, { ip: "192.0.2.50" })).toMatchObject({ ok: true, score: 20 });
  });

  it("clears memory pairs in four moves for 20 points", async () => {
    const board = buildMemoryBoard(dhakaDate(), getGameDataSync());
    await showPlay("en", { game: "memory_match" });
    const panel = screen.getByRole("tabpanel");
    expect(
      within(panel).getByText(en("games.memory.timeLeft", { seconds: 30 })),
    ).toBeInTheDocument();
    for (let pair = 0; pair < 4; pair += 1) {
      for (const [i, card] of board.cards.entries()) {
        if (card.pair !== pair) continue;
        fireEvent.click(
          within(panel).getByRole("button", { name: en("games.memory.faceDown", { n: i + 1 }) }),
        );
      }
    }
    expect(
      within(panel).getByText(en("games.memory.cleared"), { exact: false }),
    ).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: en("games.finish") }));
    expect(within(panel).getByText("20 / 20")).toBeInTheDocument();
    expect(within(panel).getByText(en("games.result.movesLine", { count: 4 }))).toBeInTheDocument();
  });

  it("orders a distance duel by tapping", async () => {
    const { labels } = await getGameData("en");
    const round = buildDuelRounds(dhakaDate(), getGameDataSync())[0]!;
    await showPlay("en", { game: "distance_duel" });
    const panel = screen.getByRole("tabpanel");
    for (const shown of round.order.slice(0, 3)) {
      const name = labels.districts[round.districts[shown]!]!;
      fireEvent.click(
        within(panel).getByRole("button", {
          name: new RegExp(`${en("games.duel.tap", { name })}$`),
        }),
      );
    }
    fireEvent.click(within(panel).getByRole("button", { name: en("games.duel.check") }));
    expect(within(panel).getByText(en("games.duel.rightOrder"))).toBeInTheDocument();
    expect(within(panel).getAllByRole("img", { name: en("games.correct") })).toHaveLength(4);
  });

  it("opens a challenge link on the friend's game with the score to beat", async () => {
    await showPlay("en", { game: "photo_clue", date: dhakaDate(), vs: "12", by: "Rahim" });
    expect(screen.getByRole("tab", { name: en("games.names.photo_clue") })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText(en("games.challenge.banner", { name: "Rahim", score: 12 })),
    ).toBeInTheDocument();
  });

  it("shows only approved names on the leaderboard, in Bengali numerals in bn", async () => {
    const today = dhakaDate();
    const rounds = buildChoiceRounds("ten_question_run", today, getGameDataSync());
    const answers = rounds.map((r, i) => (i < 15 ? r.answer : (r.answer + 1) % 4));
    const a = submitEntry(
      { game: "ten_question_run", date: today, name: "Karim", answers },
      { ip: "192.0.2.1" },
    );
    submitEntry(
      { game: "ten_question_run", date: today, name: "Hidden", answers },
      { ip: "192.0.2.2" },
    );
    if (!a.ok) throw new Error(a.message);
    setEntryApproved(a.id, true);

    await showPlay("bn");
    const board = screen.getByRole("heading", {
      name: new RegExp(bn("games.leaderboard.title", { game: bn("games.names.ten_question_run") })),
    });
    const section = board.closest("section")!;
    expect(within(section).getByText("Karim")).toBeInTheDocument();
    expect(within(section).queryByText("Hidden")).toBeNull();
    expect(within(section).getByText("১৫ / ২০")).toBeInTheDocument();
  });
});

describe("/quiz/famous", () => {
  it("asks which district a famous item is from and explains the answer", async () => {
    const { labels } = await getGameData("en");
    const round = buildChoiceRounds("famous_quiz", dhakaDate(), getGameDataSync())[0]!;
    if (round.type !== "famous") throw new Error("wrong type");
    const ui = await FamousQuizPage({
      params: Promise.resolve({ lang: "en" }),
      searchParams: Promise.resolve({}),
    });
    renderWithI18n(ui, { locale: "en" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en("quiz.famous.title"));
    const item = labels.famous[round.subject]![round.item]!;
    expect(screen.getByText(en("games.question.famous", { item }))).toBeInTheDocument();
    const wrongIndex = (round.answer + 1) % 4;
    fireEvent.click(
      screen.getByRole("button", { name: labels.districts[round.options[wrongIndex] as number]! }),
    );
    const district = labels.districts[round.subject]!;
    expect(screen.getByText(en("games.feedbackWrong", { answer: district }))).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: en("games.aboutDistrict", { district }) }),
    ).toBeInTheDocument();
  });
});

describe("/quiz/personality", () => {
  it("takes six picks and suggests places for the most-picked style", async () => {
    const ui = await PersonalityPage({ params: Promise.resolve({ lang: "en" }) });
    renderWithI18n(ui, { locale: "en" });
    for (let i = 0; i < 6; i += 1) {
      expect(
        screen.getByText(en("quiz.personality.round", { n: i + 1, total: 6 })),
      ).toBeInTheDocument();
      const options = screen.getAllByRole("button", { name: /^Choose / });
      expect(options).toHaveLength(4);
      fireEvent.click(options[0]!);
    }
    const styles = ["sea", "hills", "heritage", "countryside"].map((s) =>
      en(`quiz.personality.styles.${s}` as Parameters<typeof en>[0]),
    );
    const heading = screen.getByRole("heading", { level: 2, name: new RegExp(styles.join("|")) });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: en("quiz.personality.suggested") }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  });
});
