"use client";

import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import {
  formatDistance,
  formatHoursRange,
  formatMinutes,
  formatMoney,
  formatTime,
  localizeDigits,
  weekdayName,
} from "@/lib/format";
import type { TrainSummary } from "@/server/data/types";
import { CARD, CARD_LIFT, CardLink } from "./Card";
import { StatusTag } from "./Chip";
import { cn } from "./cn";
import { Icon } from "./Icon";

export type RouteCardData = {
  from: string;
  to: string;
  href: string;
  km: number;
  /** Bus hours [min, max]. */
  hours?: [number, number] | null;
  /** Cheapest bus fare in taka. */
  fareFrom?: number | null;
  /** Direct trains. */
  trains?: number;
};

/** Route card (DESIGN.md §4.5): `Dhaka → X`, km · hours · from ৳fare, train count, arrow. */
export function RouteCard({
  route,
  headingLevel = 3,
  className,
}: {
  route: RouteCardData;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const Heading = `h${headingLevel}` as const;
  const facts = [
    formatDistance(route.km, lang),
    route.hours ? formatHoursRange(route.hours[0], route.hours[1], lang) : null,
    route.fareFrom ? t("ui.fromFare", { fare: formatMoney(route.fareFrom, lang) }) : null,
  ].filter(Boolean);

  return (
    <article className={cn(CARD, CARD_LIFT, "flex-row items-center gap-3 p-4", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Heading className="text-h3">
          <CardLink href={route.href}>
            {route.from} <span aria-hidden>→</span>
            <span className="sr-only">–</span> {route.to}
          </CardLink>
        </Heading>
        <p className="num text-sm text-muted">{facts.join(" · ")}</p>
        {route.trains ? (
          <span className="inline-flex h-7 w-fit items-center gap-1 rounded-pill bg-surface-2 px-2.5 text-xs font-semibold text-info-text">
            <Icon name="train" size={14} />
            {t("ui.trains", { count: route.trains })}
          </span>
        ) : null}
      </div>
      <Icon
        name="arrow-right"
        size={22}
        className="text-primary transition-transform duration-[var(--dur-2)] ease-standard group-hover/card:translate-x-0.5"
      />
    </article>
  );
}

export type TrainRowData = Pick<
  TrainSummary,
  "slug" | "no" | "name" | "from" | "to" | "dep" | "arr" | "minutes" | "offDay"
>;

/** Train row (DESIGN.md §4.5): name + number, from → to, dep–arr in large numbers, off day. */
export function TrainRow({
  train,
  href,
  className,
  headingLevel = 3,
}: {
  train: TrainRowData;
  href?: string;
  className?: string;
  headingLevel?: 2 | 3 | 4;
}) {
  const Heading = `h${headingLevel}` as const;
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  return (
    <article
      className={cn(CARD, CARD_LIFT, "gap-2 p-4 sm:flex-row sm:items-center sm:gap-4", className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Heading className="text-base font-semibold">
          <CardLink href={href ?? localePath(locale, `/train/${train.slug}`)}>
            {train.name} <span className="num text-muted">({localizeDigits(train.no, lang)})</span>
          </CardLink>
        </Heading>
        <p className="truncate text-sm text-muted">
          {train.from.station} <span aria-hidden>→</span>
          <span className="sr-only">–</span> {train.to.station}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="num text-lg font-semibold whitespace-nowrap">
          {formatTime(train.dep, lang)} <span className="text-muted">–</span>{" "}
          {formatTime(train.arr, lang)}
        </p>
        <span className="num text-sm text-muted">{formatMinutes(train.minutes, lang)}</span>
        <StatusTag tone={train.offDay === null ? "good" : "neutral"}>
          {train.offDay === null
            ? t("ui.everyDay")
            : t("ui.offDay", { day: weekdayName(train.offDay, lang) })}
        </StatusTag>
      </div>
    </article>
  );
}
