"use client";

import Link from "next/link";
import { LikeButton, RateButton, useReactions, VoteButton } from "@/components/community/Reactions";
import { CARD } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/Chip";
import { cn } from "@/components/ui/cn";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { CommunitySuggestion } from "@/server/data/types";

const KIND_TONE = { place: "good", food: "sponsored", product: "info" } as const;

/** ♥ like, ▲ vote and ★ rating for a suggestion, live. */
function SuggestionReactions({ suggestion }: { suggestion: CommunitySuggestion }) {
  const { totals, mine, toggle, rate } = useReactions("suggestion", suggestion.id, {
    likes: suggestion.likes,
    votes: suggestion.votes,
    stars: suggestion.stars,
  });
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
      <LikeButton count={totals.likes} on={mine.like} onToggle={() => void toggle("like")} />
      <VoteButton count={totals.votes} on={mine.vote} onToggle={() => void toggle("vote")} />
      <RateButton stars={totals.stars} mine={mine.star} onRate={rate} />
    </div>
  );
}

/**
 * An approved visitor suggestion: type badge, name, district, short note and the community
 * reactions (♥ likes, ▲ votes, ★ rating), which visitors can add to.
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
      <SuggestionReactions suggestion={suggestion} />
    </article>
  );
}
