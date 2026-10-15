"use client";

import { useState } from "react";
import { absolute } from "@/components/my-map/ShareTools";
import { Button } from "@/components/ui/Button";
import { LeaderboardRow } from "@/components/ui/LeaderboardRow";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import { gamePath } from "@/lib/games/challenge";
import type { GameKey, LeaderboardEntry } from "@/lib/games/types";
import { shareOrCopy } from "@/lib/share";
import { LeaderboardCardDialog } from "./LeaderboardCardDialog";
import { useDateText } from "./shared";

/**
 * 🏆 Top players for one game (DESIGN.md §5.7): up to 100 approved names with their points,
 * a leaderboard image card and a share link.
 */
export function Leaderboard({
  game,
  entries,
  today,
  headingLevel = 2,
}: {
  game: GameKey;
  entries: LeaderboardEntry[];
  today: string;
  headingLevel?: 2 | 3;
}) {
  const t = useT();
  const locale = useLocale();
  const dateText = useDateText();
  const toast = useToast();
  const [cardOpen, setCardOpen] = useState(false);
  const gameName = t(`games.names.${game}` as MessageKey);
  const Heading = `h${headingLevel}` as const;
  const headingId = `leaderboard-${game}`;

  async function share() {
    const result = await shareOrCopy({
      title: t("games.leaderboard.shareTitle", { game: gameName }),
      url: absolute(`${gamePath(locale, game)}#${headingId}`),
    });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  return (
    <section aria-labelledby={headingId} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading id={headingId} className="text-h2">
          <span aria-hidden>🏆 </span>
          {t("games.leaderboard.title", { game: gameName })}
        </Heading>
        <p className="num text-sm text-muted">
          {t("games.leaderboard.players", { count: entries.length })}
        </p>
      </div>
      {entries.length ? (
        <ol className="flex flex-col gap-1">
          {entries.map((e) => (
            <LeaderboardRow
              key={`${e.rank}-${e.name}`}
              rank={e.rank}
              name={e.name}
              mode={e.date ? dateText(e.date) : undefined}
              score={e.score}
              total={e.total}
            />
          ))}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed border-border-strong p-4 text-center text-muted">
          {t("games.leaderboard.empty")}
        </p>
      )}
      <p className="text-sm text-muted">{t("games.leaderboard.note")}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" icon="gallery" onClick={() => setCardOpen(true)}>
          {t("games.leaderboard.card")}
        </Button>
        <Button variant="secondary" icon="share" onClick={share}>
          {t("games.leaderboard.share")}
        </Button>
      </div>
      <LeaderboardCardDialog
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        game={game}
        entries={entries}
        today={today}
      />
    </section>
  );
}
