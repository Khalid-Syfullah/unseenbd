"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { buildMemoryBoard } from "@/lib/games/builders";
import type { GameChallenge } from "@/lib/games/challenge";
import { recordRound } from "@/lib/games/records";
import { memoryPoints } from "@/lib/games/score";
import { MEMORY_SECONDS, type GameData, type GameLabels, type MemoryCard } from "@/lib/games/types";
import { ModeLabel } from "./ChoiceGame";
import { ResultScreen } from "./ResultScreen";
import { GameCard, useDigits } from "./shared";

/** How long a non-matching pair stays face up. */
const MISS_MS = 800;
const LIMIT_MS = MEMORY_SECONDS * 1000;

function EyeMark() {
  return (
    <svg
      viewBox="0 0 392 272"
      aria-hidden
      className="w-3/5 text-paper opacity-85"
      focusable="false"
    >
      <g transform="translate(-60 -120)" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M84 256C148 146 364 146 428 256C364 366 148 366 84 256ZM256 186a64 64 0 1 0 0.1 0Z"
        />
      </g>
    </svg>
  );
}

type End = "cleared" | "timeup" | null;

/**
 * Memory pairs (DESIGN.md §4.10): eight face-down cards, four districts and their divisions.
 * The 30-second timer starts on the first flip; the day's layout comes from the seed.
 */
export function MemoryGame({
  date,
  today,
  data,
  labels,
  challenge,
}: {
  date: string;
  today: string;
  data: GameData;
  labels: GameLabels;
  challenge?: GameChallenge | null;
}) {
  const t = useT();
  const d = useDigits();
  const board = useMemo(() => buildMemoryBoard(date, data), [date, data]);
  const [flips, setFlips] = useState<number[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<ReadonlySet<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [end, setEnd] = useState<End>(null);
  const [showResult, setShowResult] = useState(false);
  const missTimer = useRef<number | null>(null);

  const finish = useCallback(
    (how: Exclude<End, null>, movesSoFar: number, matchedSoFar: number) => {
      setEnd(how);
      recordRound("memory_match", date, memoryPoints(movesSoFar, matchedSoFar / 2));
    },
    [date],
  );

  // The countdown.
  useEffect(() => {
    if (startedAt === null || end) return;
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at - startedAt >= LIMIT_MS) finish("timeup", moves, matched.size);
    }, 200);
    return () => window.clearInterval(id);
  }, [startedAt, end, finish, moves, matched.size]);

  useEffect(
    () => () => {
      if (missTimer.current !== null) window.clearTimeout(missTimer.current);
    },
    [],
  );

  function label(card: MemoryCard): string {
    return card.kind === "district"
      ? (labels.districts[card.id] ?? "")
      : (labels.divisions[card.slug] ?? "");
  }

  function flip(i: number) {
    if (end || open.length >= 2 || open.includes(i) || matched.has(i)) return;
    const at = Date.now();
    if (startedAt !== null && at - startedAt >= LIMIT_MS) {
      finish("timeup", moves, matched.size);
      return;
    }
    if (startedAt === null) {
      setStartedAt(at);
      setNow(at);
    }
    setFlips((f) => [...f, i]);
    const nowOpen = [...open, i];
    if (nowOpen.length < 2) {
      setOpen(nowOpen);
      return;
    }
    const [a, b] = nowOpen as [number, number];
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const ca = board.cards[a]!;
    const cb = board.cards[b]!;
    if (ca.pair === cb.pair && ca.kind !== cb.kind) {
      const nextMatched = new Set(matched);
      nextMatched.add(a);
      nextMatched.add(b);
      setMatched(nextMatched);
      setOpen([]);
      if (nextMatched.size === board.cards.length) finish("cleared", nextMoves, nextMatched.size);
    } else {
      setOpen(nowOpen);
      missTimer.current = window.setTimeout(() => {
        setOpen([]);
        missTimer.current = null;
      }, MISS_MS);
    }
  }

  function restart() {
    if (missTimer.current !== null) window.clearTimeout(missTimer.current);
    setFlips([]);
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setStartedAt(null);
    setEnd(null);
    setShowResult(false);
  }

  const pairs = matched.size / 2;
  const left =
    startedAt === null
      ? MEMORY_SECONDS
      : Math.max(0, Math.ceil((LIMIT_MS - (now - startedAt)) / 1000));
  const mode = <ModeLabel game="memory_match" date={date} today={today} />;

  if (end && showResult) {
    return (
      <GameCard mode={mode}>
        <ResultScreen
          game="memory_match"
          date={date}
          today={today}
          score={memoryPoints(moves, pairs)}
          total={20}
          answers={flips}
          challenge={challenge}
          onPlayAgain={restart}
          detail={
            end === "cleared"
              ? t("games.result.movesLine", { count: moves })
              : t("games.result.timeUpLine", { count: pairs })
          }
        />
      </GameCard>
    );
  }

  return (
    <GameCard
      mode={mode}
      status={
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <span>{t("games.memory.moves", { count: moves })}</span>
          <span aria-hidden className="text-subtle">
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={16} />
            {t("games.memory.timeLeft", { seconds: left })}
          </span>
          <span aria-hidden className="text-subtle">
            ·
          </span>
          <span>{t("games.memory.pairs", { count: pairs })}</span>
        </span>
      }
    >
      <p className="text-center text-muted">{t("games.memory.hint")}</p>
      <ul aria-label={t("games.memory.board")} className="grid grid-cols-4 gap-2 sm:gap-3">
        {board.cards.map((card, i) => {
          const isMatched = matched.has(i);
          const faceUp = isMatched || open.includes(i) || end !== null;
          const name = label(card);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => flip(i)}
                aria-disabled={faceUp || end !== null || undefined}
                aria-label={
                  faceUp
                    ? `${t("games.memory.faceUp", { n: i + 1, name })}${isMatched ? `, ${t("games.memory.matched")}` : ""}`
                    : t("games.memory.faceDown", { n: i + 1 })
                }
                className="group relative block aspect-[3/4] w-full rounded-md [perspective:800px]"
              >
                <span
                  className={cn(
                    "absolute inset-0 transition-transform duration-[var(--dur-3)] ease-standard [transform-style:preserve-3d]",
                    faceUp && "[transform:rotateY(180deg)]",
                  )}
                >
                  <span className="absolute inset-0 flex items-center justify-center rounded-md bg-forest shadow-1 [backface-visibility:hidden]">
                    <EyeMark />
                  </span>
                  <span
                    className={cn(
                      "absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center gap-1 rounded-md border-[1.5px] p-1.5 text-center shadow-1 [backface-visibility:hidden]",
                      isMatched
                        ? "border-success bg-[color-mix(in_srgb,var(--success)_14%,var(--bg-raised))]"
                        : "border-border-strong bg-raised",
                    )}
                  >
                    <span className="text-xs font-semibold label-caps text-muted">
                      {card.kind === "district"
                        ? t("games.memory.district")
                        : t("games.memory.division")}
                    </span>
                    <span className="text-sm leading-tight font-semibold break-words hyphens-auto sm:text-base">
                      {name}
                    </span>
                    {isMatched ? (
                      <span className="absolute top-1 right-1 inline-flex items-center rounded-pill bg-success p-0.5 text-on-primary">
                        <Icon name="check" size={14} />
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div aria-live="polite" className="flex min-h-11 flex-col items-center gap-3 text-center">
        {end ? (
          <>
            <p className="font-semibold">
              {end === "cleared" ? t("games.memory.cleared") : t("games.memory.timeUp")}{" "}
              <span className="num">{d(`${memoryPoints(moves, pairs)} / 20`)}</span>
            </p>
            <Button
              onClick={() => setShowResult(true)}
              trailingIcon="arrow-right"
              fullWidth="mobile"
            >
              {t("games.finish")}
            </Button>
          </>
        ) : null}
      </div>
    </GameCard>
  );
}
