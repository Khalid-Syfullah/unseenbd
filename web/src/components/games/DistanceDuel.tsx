"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { buildDuelRounds } from "@/lib/games/builders";
import type { GameChallenge } from "@/lib/games/challenge";
import { recordRound } from "@/lib/games/records";
import { duelCorrect, scoreDuels } from "@/lib/games/score";
import type { GameData, GameLabels } from "@/lib/games/types";
import { ModeLabel } from "./ChoiceGame";
import { ResultScreen } from "./ResultScreen";
import { GameCard, ScoreStatus, useDigits } from "./shared";

/** `list` with the item at `from` moved to `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, item!);
  return out;
}

const identity = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * Distance duel (DESIGN.md §4.10): order four districts from nearest to farthest from a target.
 * Rows can be tapped in order, dragged, or moved with the arrow keys on their handle.
 */
export function DistanceDuel({
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
  const rounds = useMemo(() => buildDuelRounds(date, data), [date, data]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number[] | null)[]>([]);
  const [list, setList] = useState<number[]>(() => identity(4));
  const [placed, setPlaced] = useState(0);
  const [announce, setAnnounce] = useState("");
  const [done, setDone] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const focusHandle = useRef<number | null>(null);
  const handles = useRef<(HTMLButtonElement | null)[]>([]);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<"prompt" | "next" | null>(null);
  const promptId = useId();

  const round = rounds[index]!;
  const checked = answers.length > index;
  const right = answers.filter((a, i) => duelCorrect(rounds[i]!, a)).length;
  const wrong = answers.length - right;
  const nameOf = (shown: number) => labels.districts[round.districts[shown]!] ?? "";

  useEffect(() => {
    if (focusHandle.current !== null) {
      handles.current[focusHandle.current]?.focus();
      focusHandle.current = null;
    }
  }, [list]);

  useEffect(() => {
    if (focusAfter.current === "prompt") promptRef.current?.focus();
    if (focusAfter.current === "next") nextRef.current?.querySelector("button")?.focus();
    focusAfter.current = null;
  }, [index, answers.length]);

  function move(from: number, to: number, keepFocus = false) {
    if (checked || to < 0 || to > 3 || from === to) return;
    const next = moveItem(list, from, to);
    setList(next);
    setPlaced((p) => (from < p && to >= p ? p - 1 : from >= p && to < p ? p + 1 : p));
    setAnnounce(t("games.duel.moved", { name: nameOf(list[from]!), n: to + 1 }));
    if (keepFocus) focusHandle.current = to;
  }

  function tap(pos: number) {
    if (checked) return;
    if (pos < placed) {
      // Tapping a placed row takes it (and the rows after it) back out.
      setPlaced(pos);
      return;
    }
    const next = moveItem(list, pos, placed);
    const nowPlaced = placed + 1;
    setList(next);
    setPlaced(nowPlaced >= 3 ? 4 : nowPlaced);
    setAnnounce(t("games.duel.moved", { name: nameOf(list[pos]!), n: placed + 1 }));
  }

  function onHandleKey(e: KeyboardEvent<HTMLButtonElement>, pos: number) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(pos, pos - 1, true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(pos, pos + 1, true);
    }
  }

  function check() {
    focusAfter.current = "next";
    setAnswers((a) => [...a, list.slice()]);
  }

  function next() {
    if (index + 1 >= rounds.length) {
      recordRound("distance_duel", date, scoreDuels(rounds, answers));
      setDone(true);
      return;
    }
    focusAfter.current = "prompt";
    setIndex(index + 1);
    setList(identity(4));
    setPlaced(0);
    setAnnounce("");
  }

  function restart() {
    setIndex(0);
    setAnswers([]);
    setList(identity(4));
    setPlaced(0);
    setDone(false);
    focusAfter.current = "prompt";
  }

  const mode = <ModeLabel game="distance_duel" date={date} today={today} />;

  if (done) {
    return (
      <GameCard mode={mode}>
        <ResultScreen
          game="distance_duel"
          date={date}
          today={today}
          score={scoreDuels(rounds, answers)}
          total={rounds.length}
          answers={answers}
          challenge={challenge}
          onPlayAgain={restart}
          review={
            <ol className="flex flex-col divide-y divide-border">
              {rounds.map((r, i) => {
                const ok = duelCorrect(r, answers[i]);
                return (
                  <li key={i} className="flex items-start gap-3 py-3">
                    <Icon
                      name={ok ? "check" : "close"}
                      size={20}
                      label={ok ? t("games.correct") : t("games.incorrect")}
                      className={ok ? "mt-0.5 text-success" : "mt-0.5 text-danger"}
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {t("games.duel.prompt", { district: labels.districts[r.target] ?? "" })}
                      </span>
                      <span className="text-sm text-muted">
                        {r.order
                          .map((s) => `${labels.districts[r.districts[s]!] ?? ""} (${d(r.km[s]!)})`)
                          .join(" → ")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          }
        />
      </GameCard>
    );
  }

  const isRight = checked && duelCorrect(round, answers[index]);

  return (
    <GameCard
      mode={mode}
      status={
        <ScoreStatus
          round={index + 1}
          total={rounds.length}
          right={right}
          wrong={wrong}
          points={right}
        />
      }
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <p
          ref={promptRef}
          id={promptId}
          tabIndex={-1}
          className="max-w-[32ch] text-h2 text-balance outline-none"
        >
          {t("games.duel.prompt", { district: labels.districts[round.target] ?? "" })}
        </p>
        {!checked ? (
          <p className="max-w-[52ch] text-sm text-muted">{t("games.duel.hint")}</p>
        ) : null}
      </div>

      {!checked ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            ↑ {t("games.duel.nearest")}
          </p>
          <ol aria-labelledby={promptId} className="flex flex-col gap-2">
            {list.map((shown, pos) => {
              const name = nameOf(shown);
              const isPlaced = pos < placed;
              return (
                <li
                  key={shown}
                  draggable
                  onDragStart={(e) => {
                    dragFrom.current = pos;
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom.current !== null) move(dragFrom.current, pos);
                    dragFrom.current = null;
                  }}
                  className={cn(
                    "flex min-h-14 items-center gap-2 rounded-md border-[1.5px] bg-raised pr-2",
                    isPlaced ? "border-primary" : "border-border-strong",
                  )}
                >
                  <button
                    type="button"
                    ref={(el) => {
                      handles.current[pos] = el;
                    }}
                    onKeyDown={(e) => onHandleKey(e, pos)}
                    aria-label={t("games.duel.handle", { name, n: pos + 1 })}
                    className="flex h-14 w-11 shrink-0 cursor-grab items-center justify-center rounded-l-md text-xl text-muted hover:bg-surface-2"
                  >
                    <span aria-hidden>↕</span>
                  </button>
                  <span
                    aria-hidden
                    className={cn(
                      "num inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-sm font-bold",
                      isPlaced
                        ? "bg-primary text-on-primary"
                        : "border border-border-strong text-muted",
                    )}
                  >
                    {d(pos + 1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => tap(pos)}
                    aria-label={`${t("games.duel.position", { n: pos + 1 })}: ${name}. ${t("games.duel.tap", { name })}`}
                    className="flex min-h-12 flex-1 items-center rounded-sm px-2 text-left font-semibold hover:bg-surface-2"
                  >
                    {name}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            ↓ {t("games.duel.farthest")}
          </p>
          <p aria-live="polite" className="sr-only">
            {announce}
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button onClick={check} icon="check" fullWidth="mobile">
              {t("games.duel.check")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setList(identity(4));
                setPlaced(0);
              }}
            >
              {t("games.duel.reset")}
            </Button>
          </div>
        </div>
      ) : (
        <div ref={nextRef} aria-live="polite" className="flex flex-col gap-3">
          <p className="inline-flex items-center justify-center gap-2 text-center font-semibold">
            <Icon
              name={isRight ? "check" : "close"}
              size={20}
              className={isRight ? "text-success" : "text-danger"}
            />
            {isRight ? t("games.duel.rightOrder") : t("games.duel.wrongOrder")}
          </p>
          <p className="text-sm font-semibold text-muted">{t("games.duel.trueOrder")}</p>
          <ol className="flex flex-col gap-2">
            {round.order.map((shown, pos) => {
              const ok = answers[index]?.[pos] === shown;
              return (
                <li
                  key={shown}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-md border-[1.5px] px-3",
                    ok
                      ? "border-success bg-[color-mix(in_srgb,var(--success)_14%,var(--bg-raised))]"
                      : "border-danger bg-[color-mix(in_srgb,var(--danger)_14%,var(--bg-raised))]",
                  )}
                >
                  <span className="num inline-flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-sm font-bold">
                    {d(pos + 1)}
                  </span>
                  <span className="flex-1 font-semibold">{nameOf(shown)}</span>
                  <span className="num text-sm text-muted">
                    {d(t("games.duel.km", { km: round.km[shown]! }))}
                  </span>
                  <Icon
                    name={ok ? "check" : "close"}
                    size={20}
                    label={ok ? t("games.correct") : t("games.incorrect")}
                    className={ok ? "text-success" : "text-danger"}
                  />
                </li>
              );
            })}
          </ol>
          <Button
            onClick={next}
            trailingIcon="arrow-right"
            fullWidth="mobile"
            className="self-center"
          >
            {index + 1 >= rounds.length ? t("games.finish") : t("games.duel.nextRound")}
          </Button>
        </div>
      )}
    </GameCard>
  );
}
