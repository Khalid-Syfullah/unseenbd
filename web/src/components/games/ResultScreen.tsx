"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { absolute } from "@/components/my-map/ShareTools";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import { gameChallengePath, shortName, type GameChallenge } from "@/lib/games/challenge";
import { MAX_PLAYER_NAME } from "@/lib/games/names";
import { recordSubmitted, useGameRecords } from "@/lib/games/records";
import { resultRank } from "@/lib/games/score";
import { addDays } from "@/lib/games/seed";
import type { Answers, GameKey } from "@/lib/games/types";
import { shareOrCopy } from "@/lib/share";
import { setShareName, useShareName } from "@/lib/visited";
import { useDigits } from "./shared";

const SUBMIT_ERRORS = [
  "name_length",
  "name_invalid",
  "name_profane",
  "already_submitted",
  "rate_limited",
  "stale_date",
] as const;
type SubmitError = (typeof SUBMIT_ERRORS)[number] | "generic";

function errorKey(code: unknown): SubmitError {
  return (SUBMIT_ERRORS as readonly unknown[]).includes(code) ? (code as SubmitError) : "generic";
}

/** Whether a day's set can still go on the leaderboard (matches the server: today or yesterday). */
export function canSubmit(date: string, today: string): boolean {
  return date === today || date === addDays(today, -1);
}

/**
 * The result screen (DESIGN.md §4.10): big `x / 20`, a rank line, [Play again] and [Challenge a
 * friend], the personal record and the optional leaderboard name entry.
 */
export function ResultScreen({
  game,
  date,
  today,
  score,
  total,
  answers,
  detail,
  review,
  challenge,
  onPlayAgain,
}: {
  game: GameKey;
  date: string;
  today: string;
  score: number;
  total: number;
  /** Sent to the leaderboard, which scores them again. */
  answers: Answers;
  /** An extra line under the rank (e.g. moves). */
  detail?: ReactNode;
  /** The answers, round by round. */
  review?: ReactNode;
  challenge?: GameChallenge | null;
  onPlayAgain: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const d = useDigits();
  const toast = useToast();
  const records = useGameRecords();
  const sharedName = useShareName();
  const [name, setName] = useState<string | null>(null);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; score: number }
    | { kind: "error"; error: SubmitError }
  >({ kind: "idle" });
  const nameId = useId();
  const headingId = useId();
  const value = name ?? sharedName;
  const gameName = t(`games.names.${game}` as MessageKey);
  const alreadySent = records[game]?.submitted.includes(date) ?? false;

  let versus: string | null = null;
  if (challenge && challenge.game === game && challenge.date === date) {
    const who = challenge.name || t("games.challenge.friend");
    versus =
      score > challenge.score
        ? t("games.result.beat", { name: who })
        : score < challenge.score
          ? t("games.result.lost", { name: who })
          : t("games.result.tie", { name: who });
  }

  async function challengeFriend() {
    const path = gameChallengePath(locale, { game, date, score, name: shortName(value) });
    const result = await shareOrCopy({
      title: t("games.result.challengeText", { score, game: gameName }),
      url: absolute(path),
    });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game, date, name: value, answers, score }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; score?: number };
      if (res.ok) {
        recordSubmitted(game, date);
        setShareName(value);
        setState({ kind: "sent", score: body.score ?? score });
      } else {
        if (body.error === "already_submitted") recordSubmitted(game, date);
        setState({ kind: "error", error: errorKey(body.error) });
      }
    } catch {
      setState({ kind: "error", error: "generic" });
    }
  }

  const rank = resultRank(score);

  return (
    <div className="flex flex-col gap-6" aria-labelledby={headingId} role="group">
      <div className="flex flex-col items-center gap-2 text-center" aria-live="polite">
        <p id={headingId} className="text-sm font-semibold tracking-wide text-muted uppercase">
          {t("games.result.title")}
        </p>
        <p className="num font-display text-display leading-none">
          {d(t("games.result.score", { score, total }))}
        </p>
        <p className="text-h3">{t(`games.result.ranks.${rank}` as MessageKey)}</p>
        {detail ? <p className="text-muted">{detail}</p> : null}
        {versus ? (
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <Icon name="trophy" size={18} className="text-accent" />
            {versus}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="accent" size="lg" onClick={onPlayAgain}>
          {t("games.result.playAgain")}
        </Button>
        <Button variant="secondary" size="lg" icon="share" onClick={challengeFriend}>
          {t("games.result.challenge")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-sunken p-4">
        <h3 className="text-h3">{t("games.submit.title")}</h3>
        {!canSubmit(date, today) ? (
          <p className="text-muted">{t("games.submit.notToday")}</p>
        ) : state.kind === "sent" ? (
          <p role="status" className="inline-flex items-start gap-2">
            <Icon name="check" size={20} className="mt-0.5 text-success" />
            {t("games.submit.sent", { score: state.score })}
          </p>
        ) : alreadySent ? (
          <p className="text-muted">{t("games.submit.already")}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Field
              label={t("games.submit.name")}
              htmlFor={nameId}
              hint={t("games.submit.hint")}
              error={
                state.kind === "error"
                  ? t(`games.submit.errors.${state.error}` as MessageKey)
                  : undefined
              }
              className="max-w-[420px]"
            >
              <TextInput
                id={nameId}
                value={value}
                required
                minLength={2}
                maxLength={MAX_PLAYER_NAME}
                autoComplete="nickname"
                invalid={state.kind === "error"}
                aria-describedby={`${nameId}-${state.kind === "error" ? "error" : "hint"}`}
                onChange={(e) => {
                  setName(e.target.value);
                  if (state.kind === "error") setState({ kind: "idle" });
                }}
              />
            </Field>
            <Button
              type="submit"
              icon="trophy"
              loading={state.kind === "sending"}
              fullWidth="mobile"
            >
              {t("games.submit.send")}
            </Button>
          </form>
        )}
      </div>

      {review ? (
        <details className="rounded-lg border border-border">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">
            {t("games.result.review")}
          </summary>
          <div className="px-4 pb-4">{review}</div>
        </details>
      ) : null}
    </div>
  );
}
