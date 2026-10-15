"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { absolute } from "@/components/my-map/ShareTools";
import { Button } from "@/components/ui/Button";
import { CardGrid } from "@/components/ui/Card";
import { isKind, KindBadge } from "@/components/ui/Chip";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import {
  buildPersonalityRounds,
  personalityResult,
  type TravelStyle,
} from "@/lib/games/personality";
import { shareOrCopy } from "@/lib/share";
import type { PersonalityPlace } from "@/server/data/games";
import { GameCard, useDigits } from "./shared";

const SUGGESTIONS = 6;

/**
 * The travel personality quiz (FEATURES.md §5.11): six picks between four kinds of place, then
 * the most-picked style with places to match. No score, no leaderboard.
 */
export function PersonalityQuiz({
  date,
  places,
  pools,
}: {
  date: string;
  places: Record<string, PersonalityPlace>;
  pools: Record<TravelStyle, string[]>;
}) {
  const t = useT();
  const locale = useLocale();
  const d = useDigits();
  const toast = useToast();
  const rounds = useMemo(() => buildPersonalityRounds(date, pools), [date, pools]);
  const [picks, setPicks] = useState<{ style: TravelStyle; slug: string }[]>([]);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const promptId = useId();

  const done = picks.length >= rounds.length;
  const style = done ? personalityResult(picks.map((p) => p.style)) : null;

  useEffect(() => {
    if (!moved.current) return;
    if (done) resultRef.current?.focus();
    else promptRef.current?.focus();
  }, [picks.length, done]);

  function pick(option: { style: TravelStyle; slug: string }) {
    moved.current = true;
    setPicks((p) => [...p, option]);
  }

  if (done && style) {
    const chosen = picks.filter((p) => p.style === style).map((p) => p.slug);
    const suggested = [...new Set([...chosen, ...pools[style]])]
      .slice(0, SUGGESTIONS)
      .map((slug) => places[slug])
      .filter((p): p is PersonalityPlace => !!p);
    const styleName = t(`quiz.personality.styles.${style}` as MessageKey);

    async function share() {
      const result = await shareOrCopy({
        title: t("quiz.personality.shareText", { style: styleName }),
        url: absolute(localePath(locale, "/quiz/personality")),
      });
      if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    }

    return (
      <div className="flex flex-col gap-8">
        <GameCard mode={t("quiz.personality.resultKicker")}>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 ref={resultRef} tabIndex={-1} className="font-display text-display outline-none">
              {styleName}
            </h2>
            <p className="max-w-[56ch] text-lg text-muted">
              {t(`quiz.personality.bodies.${style}` as MessageKey)}
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                variant="accent"
                size="lg"
                onClick={() => {
                  moved.current = true;
                  setPicks([]);
                }}
              >
                {t("quiz.personality.again")}
              </Button>
              <Button variant="secondary" size="lg" icon="share" onClick={share}>
                {t("quiz.personality.share")}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted">{t("quiz.personality.picks")}</h3>
            <ol className="flex flex-wrap gap-2">
              {picks.map((p, i) => (
                <li
                  key={`${p.slug}-${i}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-surface-2 px-3 text-sm font-semibold"
                >
                  <span className="num text-muted">{d(i + 1)}</span>
                  {places[p.slug]?.name ?? p.slug}
                </li>
              ))}
            </ol>
          </div>
        </GameCard>
        <section className="flex flex-col gap-4" aria-labelledby={`${promptId}-suggested`}>
          <h2 id={`${promptId}-suggested`} className="text-h2">
            {t("quiz.personality.suggested")}
          </h2>
          <CardGrid max={3}>
            {suggested.map((place) => (
              <PlaceCard key={place.slug} place={place} />
            ))}
          </CardGrid>
        </section>
      </div>
    );
  }

  const index = picks.length;
  const round = rounds[index] ?? [];

  return (
    <GameCard
      mode={t("quiz.personality.title")}
      status={t("quiz.personality.round", { n: index + 1, total: rounds.length })}
    >
      <p
        ref={promptRef}
        id={promptId}
        tabIndex={-1}
        className="text-center text-h2 text-balance outline-none"
      >
        {t("quiz.personality.question")}
      </p>
      <ul aria-labelledby={promptId} className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
        {round.map((option) => {
          const place = places[option.slug];
          if (!place) return null;
          return (
            <li key={option.slug}>
              <button
                type="button"
                onClick={() => pick(option)}
                aria-label={t("quiz.personality.pick", {
                  name: place.name,
                  district: place.district.name,
                })}
                className="group flex w-full flex-col overflow-hidden rounded-lg border-[1.5px] border-border-strong bg-raised text-left transition-[border-color,translate] duration-[var(--dur-2)] ease-standard hover:-translate-y-0.5 hover:border-primary"
              >
                <span className="relative block aspect-[3/2] w-full bg-surface-2">
                  {place.cover ? (
                    <Image
                      src={place.cover.w640}
                      alt=""
                      fill
                      sizes="(min-width: 480px) 50vw, 100vw"
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                  {isKind(place.kind.key) ? (
                    <KindBadge
                      kind={place.kind.key}
                      label={place.kind.label}
                      className="absolute top-2 left-2"
                    />
                  ) : null}
                </span>
                <span className="flex flex-col gap-0.5 p-3">
                  <span className="font-semibold">{place.name}</span>
                  <span className="text-sm text-muted">{place.district.name}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </GameCard>
  );
}
