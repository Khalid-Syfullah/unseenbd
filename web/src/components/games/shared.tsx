"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatDate, localizeDigits } from "@/lib/format";
import type { GameKey } from "@/lib/games/types";

/** Icon file per game (`assets/icons/games`). */
export const GAME_ICONS: Readonly<Record<GameKey, string>> = {
  ten_question_run: "ten-question-sprint",
  photo_clue: "photo-clue",
  memory_match: "memory-pairs",
  distance_duel: "distance-duel",
  district_quiz: "district-quiz",
  famous_quiz: "famous-quiz",
};

/** The coloured game icon (decorative). */
export function GameIcon({
  game,
  size = 20,
  className,
}: {
  game: GameKey;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/icons/games/${GAME_ICONS[game]}.svg`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0", className)}
    />
  );
}

/** Digits in the page's numerals. */
export function useDigits(): (value: string | number) => string {
  const lang = contentLocale(useLocale());
  return (value) => localizeDigits(value, lang);
}

/** A date like "15 October 2026" in the page's language. */
export function useDateText(): (date: string) => string {
  const lang = contentLocale(useLocale());
  return (date) => formatDate(date, lang);
}

/**
 * The game card (DESIGN.md §4.10): raised, radius 28, padding 24; a header row with the mode
 * label on the left and the running score on the right.
 */
export function GameCard({
  mode,
  status,
  children,
  className,
  labelledBy,
}: {
  mode: ReactNode;
  status?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "flex flex-col gap-5 rounded-xl border border-border bg-raised p-4 shadow-1 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <div className="flex min-w-0 items-center gap-2 font-semibold text-muted">{mode}</div>
        {status ? <div className="num font-semibold">{status}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** `Round 3/20 · ✓ 2 · ✗ 0 · 2` with a full sentence for screen readers. */
export function ScoreStatus({
  round,
  total,
  right,
  wrong,
  points,
}: {
  round: number;
  total: number;
  right: number;
  wrong: number;
  points: number;
}) {
  const t = useT();
  const d = useDigits();
  return (
    <>
      <span className="sr-only">
        {t("games.status", { n: round, total, right, wrong, points })}
      </span>
      <span aria-hidden className="inline-flex flex-wrap items-center gap-x-2">
        <span>{t("games.round", { n: round, total })}</span>
        <span className="text-subtle">·</span>
        <span className="inline-flex items-center gap-0.5">
          <Icon name="check" size={16} className="text-success" />
          {d(right)}
        </span>
        <span className="text-subtle">·</span>
        <span className="inline-flex items-center gap-0.5">
          <Icon name="close" size={16} className="text-danger" />
          {d(wrong)}
        </span>
        <span className="text-subtle">·</span>
        <span>{d(points)}</span>
      </span>
    </>
  );
}

export type AnswerState = "idle" | "correct" | "wrong" | "dimmed";

/**
 * An answer option (DESIGN.md §4.10): 56 px, full width (2×2 from 480 px). After answering, the
 * right one gets a ✓ and the chosen wrong one a ✗ — always an icon and a word, never colour alone.
 */
export function AnswerButton({
  state,
  label,
  onClick,
  disabled,
  children,
}: {
  state: AnswerState;
  /** The option's words; after answering, the button is named "{label}, Correct" / "…, Wrong". */
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        state === "correct"
          ? `${label}, ${t("games.correct")}`
          : state === "wrong"
            ? `${label}, ${t("games.incorrect")}`
            : undefined
      }
      className={cn(
        "relative flex min-h-14 w-full items-center gap-3 rounded-md border-[1.5px] px-4 py-2 text-left text-base font-semibold",
        "transition-[background-color,border-color,opacity] duration-[var(--dur-1)] ease-standard",
        state === "idle" &&
          "border-border-strong bg-raised hover:border-primary hover:bg-primary-wash",
        state === "correct" &&
          "border-success bg-[color-mix(in_srgb,var(--success)_14%,var(--bg-raised))] text-text",
        state === "wrong" &&
          "border-danger bg-[color-mix(in_srgb,var(--danger)_14%,var(--bg-raised))] text-text",
        state === "dimmed" && "border-border-strong bg-raised opacity-60",
        disabled && "cursor-default",
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {state === "correct" ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-sm">
          <Icon name="check" size={20} className="text-success" />
          {t("games.correct")}
        </span>
      ) : state === "wrong" ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-sm">
          <Icon name="close" size={20} className="text-danger" />
          {t("games.incorrect")}
        </span>
      ) : null}
    </button>
  );
}
