"use client";

import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { localizeDigits } from "@/lib/format";
import { Avatar } from "./Avatar";
import { cn } from "./cn";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

/**
 * Leaderboard row (DESIGN.md §4.7): rank (medals for the top three), avatar initial, name, mode
 * label, and the score `n / 20` right-aligned in tabular numbers. Use inside an `<ol>`.
 */
export function LeaderboardRow({
  rank,
  name,
  mode,
  score,
  total,
  highlight = false,
  className,
}: {
  rank: number;
  name: string;
  mode?: string;
  score: number;
  total: number;
  /** The current player's own row. */
  highlight?: boolean;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const medal = rank >= 1 && rank <= 3 ? MEDALS[rank - 1] : null;
  return (
    <li
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2",
        highlight ? "bg-primary-wash" : "odd:bg-sunken",
        className,
      )}
    >
      <span className="num w-8 shrink-0 text-center text-lg font-bold text-muted">
        <span className="sr-only">{t("ui.rank", { rank })}</span>
        <span aria-hidden>{medal ?? localizeDigits(rank, lang)}</span>
      </span>
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{name}</span>
        {mode ? <span className="truncate text-xs text-muted">{mode}</span> : null}
      </span>
      <span className="num shrink-0 text-right text-lg font-semibold">
        {localizeDigits(`${score} / ${total}`, lang)}
      </span>
    </li>
  );
}
