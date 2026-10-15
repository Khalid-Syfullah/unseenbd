"use client";

import type { GameChallenge } from "@/lib/games/challenge";
import type { GameData, GameLabels, LeaderboardEntry, QuizGame } from "@/lib/games/types";
import { ChallengeBanner } from "./ChallengeBanner";
import { ChoiceGame } from "./ChoiceGame";
import { Leaderboard } from "./Leaderboard";
import { RecordStrip } from "./RecordStrip";

/** A scored quiz page body: the question card, the personal record and the leaderboard. */
export function QuizArena({
  game,
  data,
  labels,
  today,
  challenge,
  entries,
}: {
  game: QuizGame;
  data: GameData;
  labels: GameLabels;
  today: string;
  challenge: GameChallenge | null;
  entries: LeaderboardEntry[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {challenge ? <ChallengeBanner challenge={challenge} /> : null}
      <ChoiceGame
        game={game}
        date={challenge?.date ?? today}
        today={today}
        data={data}
        labels={labels}
        challenge={challenge}
        explain
      />
      <RecordStrip game={game} className="justify-center" />
      <Leaderboard game={game} entries={entries} today={today} />
    </div>
  );
}
