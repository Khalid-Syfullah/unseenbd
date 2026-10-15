"use client";

import type { ReactNode } from "react";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import { formatMonthRange, formatNumber, formatStars, localizeDigits } from "@/lib/format";
import type { PlacePhoto } from "@/server/db/json-types";
import type { PlaceSummary } from "@/server/data/types";
import { CARD, CARD_LIFT, CardLink } from "./Card";
import { isKind, KindBadge, StatusTag } from "./Chip";
import { cn } from "./cn";
import { Icon } from "./Icon";
import { PlaceImage } from "./PlaceImage";

/** The fields a place card shows (a `PlaceSummary` has them all). */
export type PlaceCardData = Pick<
  PlaceSummary,
  "slug" | "name" | "district" | "kind" | "bestFromMonth" | "bestToMonth" | "cover" | "description"
> & { photo?: Pick<PlacePhoto, "author" | "license" | "source"> | null };

export type PlaceCounts = { likes?: number; votes?: number; stars?: number };

function Counts({ counts }: { counts: PlaceCounts }) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const items: { key: string; icon: "heart" | "upvote" | "star"; text: string; label: string }[] =
    [];
  if (counts.likes !== undefined)
    items.push({
      key: "likes",
      icon: "heart",
      text: formatNumber(counts.likes, lang),
      label: t("ui.likes", { count: counts.likes }),
    });
  if (counts.votes !== undefined)
    items.push({
      key: "votes",
      icon: "upvote",
      text: formatNumber(counts.votes, lang),
      label: t("ui.votes", { count: counts.votes }),
    });
  if (counts.stars !== undefined) {
    const stars = formatStars(counts.stars, lang).replace("★ ", "");
    items.push({ key: "stars", icon: "star", text: stars, label: stars });
  }
  if (!items.length) return null;
  return (
    <ul className="flex items-center gap-3 text-sm text-muted">
      {items.map((item) => (
        <li key={item.key} className="num inline-flex items-center gap-1">
          <Icon name={item.icon} size={16} />
          <span aria-hidden>{item.text}</span>
          <span className="sr-only">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Place card (DESIGN.md §4.5): 3:2 cover with kind badge and "Good this month", title,
 * `District · Type`, two-line intro, best months, optional ♥ ▲ ★ counts.
 */
export function PlaceCard({
  place,
  href,
  goodThisMonth = false,
  counts,
  headingLevel = 3,
  priority = false,
  className,
}: {
  place: PlaceCardData;
  href?: string;
  goodThisMonth?: boolean;
  counts?: PlaceCounts;
  headingLevel?: 2 | 3 | 4;
  /** Load the image eagerly (the first cards above the fold). */
  priority?: boolean;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  const Heading = `h${headingLevel}` as const;
  const link = href ?? localePath(locale, `/place/${place.slug}`);

  return (
    <article className={cn(CARD, CARD_LIFT, className)}>
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-2">
        {place.cover ? (
          <PlaceImage
            w640={place.cover.w640}
            w1200={place.cover.w1200}
            alt=""
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw"
            priority={priority}
          />
        ) : null}
        {place.photo ? (
          <p className="absolute inset-x-0 bottom-0 z-10 truncate bg-[image:var(--scrim)] px-3 pt-6 pb-1.5 text-xs text-on-scrim">
            <a
              href={place.photo.source}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {t("place.creditPhoto", { by: place.photo.author, license: place.photo.license })}
            </a>
          </p>
        ) : null}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {isKind(place.kind.key) ? (
            <KindBadge kind={place.kind.key} label={place.kind.label} />
          ) : (
            <span />
          )}
          {goodThisMonth ? (
            <StatusTag tone="good" icon="calendar">
              {t("common.goodThisMonth")}
            </StatusTag>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="text-h3">
          <CardLink href={link}>{place.name}</CardLink>
        </Heading>
        <p className="text-sm text-muted">
          {place.district.name} · {place.kind.label}
        </p>
        {place.description ? <p className="line-clamp-2 text-base">{place.description}</p> : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Icon name="calendar" size={16} />
            <span className="sr-only">{t("common.bestTime")}: </span>
            {formatMonthRange(place.bestFromMonth, place.bestToMonth, lang)}
          </p>
          {counts ? <Counts counts={counts} /> : null}
        </div>
      </div>
    </article>
  );
}

/**
 * Compact place row (trending lists, "more in this district"): 72×72 image, title, meta, and a
 * rank number or distance at the left.
 */
export function PlaceRow({
  place,
  href,
  rank,
  aside,
  meta,
  className,
}: {
  place: {
    slug: string;
    name: string;
    district: { name: string };
    kind: { label: string };
    cover: { w640: string } | null;
  };
  href?: string;
  /** Rank in a list (1-based), shown at the left. */
  rank?: number;
  /** Text shown at the left instead of a rank, e.g. a distance. */
  aside?: ReactNode;
  /** Replaces the default `District · Type` line. */
  meta?: ReactNode;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  const link = href ?? localePath(locale, `/place/${place.slug}`);
  return (
    <div
      className={cn(
        "group/card relative flex min-h-[88px] items-center gap-3 rounded-md p-2 transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2",
        "has-[[data-card-link]:focus-visible]:outline-3 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-focus",
        className,
      )}
    >
      {rank !== undefined ? (
        <span className="num w-8 shrink-0 text-center font-display text-h2 text-primary">
          <span className="sr-only">{t("ui.rank", { rank })}</span>
          <span aria-hidden>{localizeDigits(rank, lang)}</span>
        </span>
      ) : aside !== undefined ? (
        <span className="num w-14 shrink-0 text-center text-sm font-semibold text-muted">
          {aside}
        </span>
      ) : null}
      <div className="size-[72px] shrink-0 overflow-hidden rounded-md bg-surface-2">
        {place.cover ? (
          <PlaceImage w640={place.cover.w640} alt="" sizes="72px" width={72} height={72} />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col">
        <CardLink href={link} className="truncate text-base font-semibold">
          {place.name}
        </CardLink>
        <span className="truncate text-sm text-muted">
          {meta ?? `${place.district.name} · ${place.kind.label}`}
        </span>
      </div>
    </div>
  );
}
