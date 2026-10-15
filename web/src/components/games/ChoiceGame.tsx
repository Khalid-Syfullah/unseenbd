"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import { buildChoiceRounds } from "@/lib/games/builders";
import type { GameChallenge } from "@/lib/games/challenge";
import { recordRound } from "@/lib/games/records";
import { scoreChoices, wrongPenalty } from "@/lib/games/score";
import type { ChoiceRound, GameData, GameLabels } from "@/lib/games/types";
import { ResultScreen } from "./ResultScreen";
import {
  AnswerButton,
  GameCard,
  GameIcon,
  ScoreStatus,
  useDateText,
  type AnswerState,
} from "./shared";

export type ChoiceGameKey = "ten_question_run" | "photo_clue" | "district_quiz" | "famous_quiz";

/** The words for one option. */
function optionLabel(round: ChoiceRound, i: number, labels: GameLabels): string {
  const value = round.options[i];
  if (round.type === "division") return labels.divisions[value as string] ?? String(value);
  return labels.districts[value as number] ?? String(value);
}

function famousItem(round: ChoiceRound, labels: GameLabels): string {
  return round.type === "famous" ? (labels.famous[round.subject]?.[round.item] ?? "") : "";
}

/** The question line. */
function useQuestion(labels: GameLabels) {
  const t = useT();
  return (round: ChoiceRound) => {
    if (round.type === "division") {
      return t("games.question.division", { district: labels.districts[round.subject] ?? "" });
    }
    if (round.type === "silhouette") return t("games.question.silhouette");
    return t("games.question.famous", { item: famousItem(round, labels) });
  };
}

/** Header label: the game's icon and name, and which day's set this is. */
export function ModeLabel({
  game,
  date,
  today,
}: {
  game: Parameters<typeof GameIcon>[0]["game"];
  date: string;
  today: string;
}) {
  const t = useT();
  const dateText = useDateText();
  return (
    <>
      <GameIcon game={game} size={22} />
      <span className="truncate">
        {t(`games.names.${game}` as MessageKey)} ·{" "}
        {date === today
          ? t("games.todaySet", { date: dateText(date) })
          : t("games.pastSet", { date: dateText(date) })}
      </span>
    </>
  );
}

/**
 * A 20-question multiple-choice game: the Ten-question sprint, Photo clue, and the district and
 * famous-foods quizzes. One try per question; the right answer is shown after each pick.
 */
export function ChoiceGame({
  game,
  date,
  today,
  data,
  labels,
  challenge,
  explain = false,
}: {
  game: ChoiceGameKey;
  date: string;
  today: string;
  data: GameData;
  labels: GameLabels;
  challenge?: GameChallenge | null;
  /** Quiz pages: a short explanation and a link to the district after each answer. */
  explain?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const rounds = useMemo(() => buildChoiceRounds(game, date, data), [game, date, data]);
  const question = useQuestion(labels);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef<"question" | "next" | null>(null);
  const questionId = useId();
  const penalty = wrongPenalty(game);

  const round = rounds[index]!;
  const picked = answers[index];
  const answered = answers.length > index;
  const right = answers.filter((a, i) => a === rounds[i]!.answer).length;
  const wrong = answers.filter((a, i) => a !== null && a !== rounds[i]!.answer).length;
  const points = scoreChoices(rounds, answers, penalty);

  useEffect(() => {
    if (focusNext.current === "next") nextRef.current?.querySelector("button")?.focus();
    if (focusNext.current === "question") questionRef.current?.focus();
    focusNext.current = null;
  }, [index, answers.length]);

  function choose(i: number) {
    if (answered) return;
    focusNext.current = "next";
    setAnswers((a) => [...a, i]);
  }

  function next() {
    if (index + 1 >= rounds.length) {
      recordRound(game, date, scoreChoices(rounds, answers, penalty));
      setDone(true);
      return;
    }
    focusNext.current = "question";
    setIndex(index + 1);
  }

  function restart() {
    setAnswers([]);
    setIndex(0);
    setDone(false);
    focusNext.current = "question";
  }

  const mode = <ModeLabel game={game} date={date} today={today} />;

  if (done) {
    return (
      <GameCard mode={mode}>
        <ResultScreen
          game={game}
          date={date}
          today={today}
          score={points}
          total={rounds.length}
          answers={answers}
          challenge={challenge}
          onPlayAgain={restart}
          review={
            <ol className="flex flex-col divide-y divide-border">
              {rounds.map((r, i) => {
                const ok = answers[i] === r.answer;
                return (
                  <li key={i} className="flex items-start gap-3 py-3">
                    <Icon
                      name={ok ? "check" : "close"}
                      size={20}
                      label={ok ? t("games.correct") : t("games.incorrect")}
                      className={ok ? "mt-0.5 text-success" : "mt-0.5 text-danger"}
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{question(r)}</span>
                      <span className="text-sm text-muted">
                        {optionLabel(r, r.answer, labels)}
                        {!ok && answers[i] !== null && answers[i] !== undefined
                          ? ` · ${t("games.incorrect")}: ${optionLabel(r, answers[i]!, labels)}`
                          : ""}
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

  function stateOf(i: number): AnswerState {
    if (!answered) return "idle";
    if (i === round.answer) return "correct";
    if (i === picked) return "wrong";
    return "dimmed";
  }

  const subjectName = labels.districts[round.subject] ?? "";
  const subjectSlug = data.districts.find((d) => d.id === round.subject)?.slug;

  return (
    <GameCard
      mode={mode}
      status={
        <ScoreStatus
          round={index + 1}
          total={rounds.length}
          right={right}
          wrong={wrong}
          points={points}
        />
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {round.type === "silhouette" && subjectSlug ? (
          <Image
            src={`/maps/silhouettes/${subjectSlug}.svg`}
            alt={t("games.silhouetteAlt")}
            width={240}
            height={240}
            unoptimized
            priority={index === 0}
            className="size-[200px] sm:size-[240px]"
          />
        ) : null}
        <p
          ref={questionRef}
          id={questionId}
          tabIndex={-1}
          className="max-w-[32ch] text-h2 text-balance outline-none"
        >
          {question(round)}
        </p>
      </div>

      <div role="group" aria-labelledby={questionId} className="grid gap-3 sm:grid-cols-2">
        {round.options.map((_, i) => (
          <AnswerButton
            key={i}
            label={optionLabel(round, i, labels)}
            state={stateOf(i)}
            disabled={answered}
            onClick={() => choose(i)}
          >
            {optionLabel(round, i, labels)}
          </AnswerButton>
        ))}
      </div>

      <div
        ref={nextRef}
        aria-live="polite"
        className="flex min-h-11 flex-col items-center gap-3 text-center"
      >
        {answered ? (
          <>
            <p className="inline-flex items-center gap-2 font-semibold">
              <Icon
                name={picked === round.answer ? "check" : "close"}
                size={20}
                className={picked === round.answer ? "text-success" : "text-danger"}
              />
              {picked === round.answer
                ? t("games.feedbackRight")
                : t("games.feedbackWrong", { answer: optionLabel(round, round.answer, labels) })}
            </p>
            {explain ? (
              <p className="text-muted">
                {round.type === "famous"
                  ? t("games.explainFamous", {
                      item: famousItem(round, labels),
                      district: subjectName,
                    })
                  : t("games.explainDivision", {
                      district: subjectName,
                      division:
                        labels.divisions[
                          data.districts.find((d) => d.id === round.subject)?.division ?? ""
                        ] ?? "",
                    })}{" "}
                {subjectSlug ? (
                  <Link
                    href={localePath(locale, `/district/${subjectSlug}`)}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {t("games.aboutDistrict", { district: subjectName })}
                  </Link>
                ) : null}
              </p>
            ) : null}
            <Button onClick={next} trailingIcon="arrow-right" fullWidth="mobile">
              {index + 1 >= rounds.length ? t("games.finish") : t("games.next")}
            </Button>
          </>
        ) : null}
      </div>
    </GameCard>
  );
}
