"use client";

import { useState } from "react";
import { PillTabs, TabPanel } from "@/components/ui/Navigation";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import type { GameChallenge } from "@/lib/games/challenge";
import {
  HUB_GAMES,
  type GameData,
  type GameLabels,
  type HubGame,
  type LeaderboardEntry,
} from "@/lib/games/types";
import { ChallengeBanner } from "./ChallengeBanner";
import { ChoiceGame } from "./ChoiceGame";
import { DistanceDuel } from "./DistanceDuel";
import { Leaderboard } from "./Leaderboard";
import { MemoryGame } from "./MemoryGame";
import { RecordStrip } from "./RecordStrip";
import { GameIcon } from "./shared";

const PREFIX = "game";

/**
 * The game hub (DESIGN.md §5.7): pill tabs for the four daily games; each tab holds the game card,
 * its rules, the personal record and the game's leaderboard. The open tab is kept in `?game=`.
 */
export function GameHub({
  data,
  labels,
  today,
  initialGame,
  challenge,
  boards,
}: {
  data: GameData;
  labels: GameLabels;
  today: string;
  initialGame: HubGame;
  challenge: GameChallenge | null;
  boards: Record<HubGame, LeaderboardEntry[]>;
}) {
  const t = useT();
  const [active, setActive] = useState<HubGame>(initialGame);

  function select(id: string) {
    const game = id as HubGame;
    setActive(game);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("game", game);
      if (challenge && challenge.game !== game) {
        for (const k of ["date", "vs", "by"]) url.searchParams.delete(k);
      }
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // the URL just does not follow the tab
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PillTabs
        label={t("games.tabs")}
        idPrefix={PREFIX}
        value={active}
        onChange={select}
        tabs={HUB_GAMES.map((g) => ({
          id: g,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <GameIcon game={g} size={20} />
              {t(`games.names.${g}` as MessageKey)}
            </span>
          ),
        }))}
        className="md:justify-center"
      />
      {HUB_GAMES.map((game) => {
        const own = challenge && challenge.game === game ? challenge : null;
        const date = own?.date ?? today;
        return (
          <TabPanel
            key={game}
            idPrefix={PREFIX}
            id={game}
            active={active === game}
            className="flex flex-col gap-6 outline-none"
          >
            <p className="mx-auto max-w-[60ch] text-center text-muted">
              {t(`games.rules.${game}` as MessageKey)}
            </p>
            {own ? <ChallengeBanner challenge={own} /> : null}
            {game === "memory_match" ? (
              <MemoryGame date={date} today={today} data={data} labels={labels} challenge={own} />
            ) : game === "distance_duel" ? (
              <DistanceDuel date={date} today={today} data={data} labels={labels} challenge={own} />
            ) : (
              <ChoiceGame
                game={game}
                date={date}
                today={today}
                data={data}
                labels={labels}
                challenge={own}
              />
            )}
            <RecordStrip game={game} className="justify-center" />
            <Leaderboard game={game} entries={boards[game]} today={today} />
          </TabPanel>
        );
      })}
    </div>
  );
}
