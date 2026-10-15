"use client";

import Link from "next/link";
import { CARD } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/Chip";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import { formatNumber, formatStars } from "@/lib/format";
import type { CommunitySuggestion } from "@/server/data/types";

const KIND_TONE = { place: "good", food: "sponsored", product: "info" } as const;

/**
 * An approved visitor suggestion: type badge, name, district, short note and the community
 * counts (♥ likes, ▲ votes, ★ rating).
 */
export function SuggestionCard({
  suggestion,
  className,
}: {
  suggestion: CommunitySuggestion;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const lang = contentLocale(locale);
  const stars = suggestion.stars !== null ? formatStars(suggestion.stars, lang) : null;

  return (
    <article className={cn(CARD, "h-full gap-2 p-4", className)}>
      <StatusTag tone={KIND_TONE[suggestion.kind]}>
        {t(`home.suggestions.${suggestion.kind}`)}
      </StatusTag>
      <h3 className="text-h3">{suggestion.name}</h3>
      {suggestion.district ? (
        <p className="text-sm text-muted">
          <Link
            href={localePath(locale, `/district/${suggestion.district.slug}`)}
            className="hover:text-primary hover:underline"
          >
            {suggestion.district.name}
          </Link>
        </p>
      ) : null}
      {suggestion.body ? <p className="line-clamp-3">{suggestion.body}</p> : null}
      <ul className="mt-auto flex items-center gap-3 pt-1 text-sm text-muted">
        <li className="num inline-flex items-center gap-1">
          <Icon name="heart" size={16} />
          <span aria-hidden>{formatNumber(suggestion.likes, lang)}</span>
          <span className="sr-only">{t("ui.likes", { count: suggestion.likes })}</span>
        </li>
        <li className="num inline-flex items-center gap-1">
          <Icon name="upvote" size={16} />
          <span aria-hidden>{formatNumber(suggestion.votes, lang)}</span>
          <span className="sr-only">{t("ui.votes", { count: suggestion.votes })}</span>
        </li>
        {stars ? (
          <li className="num inline-flex items-center gap-1">
            <Icon name="star" size={16} />
            {stars.replace("★ ", "")}
          </li>
        ) : null}
      </ul>
    </article>
  );
}
