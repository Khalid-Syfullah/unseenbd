"use client";

import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { useGameRecords } from "@/lib/games/records";
import type { GameKey } from "@/lib/games/types";
import { useDateText, useDigits } from "./shared";

/**
 * The personal record for a game, from this browser: best score and the last five rounds
 * (newest first). Empty on the server; fills in after hydration.
 */
export function RecordStrip({ game, className }: { game: GameKey; className?: string }) {
  const t = useT();
  const d = useDigits();
  const dateText = useDateText();
  const record = useGameRecords()[game];

  return (
    <section
      aria-label={t("games.record.title")}
      className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", className)}
    >
      {record && record.best !== null ? (
        <>
          <p className="inline-flex items-center gap-1.5">
            <Icon name="trophy" size={18} className="text-accent" />
            <span className="text-muted">{t("games.record.best")}:</span>
            <span className="num font-semibold">{d(record.best)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted">{t("games.record.lastFive")}:</span>
            <ol className="flex flex-wrap gap-1.5">
              {record.recent.map((r, i) => (
                <li
                  key={`${r.date}-${i}`}
                  title={dateText(r.date)}
                  className="num inline-flex h-7 min-w-8 items-center justify-center rounded-pill bg-surface-2 px-2 font-semibold"
                >
                  {d(r.score)}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <p className="text-muted">{t("games.record.none")}</p>
      )}
    </section>
  );
}
