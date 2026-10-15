import { Icon } from "@/components/ui/Icon";
import { formatNumber, formatStars } from "@/lib/format";

/** `♥ 3 · ▲ 8 · ★ 7/10` for a trending row. Labels are for screen readers. */
export function TrendMeta({
  likes,
  votes,
  stars,
  lang,
  likesLabel,
  votesLabel,
}: {
  likes: number;
  votes: number;
  stars: number;
  lang: string;
  likesLabel: string;
  votesLabel: string;
}) {
  return (
    <span className="num inline-flex flex-wrap items-center gap-x-3">
      <span className="inline-flex items-center gap-1">
        <Icon name="heart" size={14} />
        <span aria-hidden>{formatNumber(likes, lang)}</span>
        <span className="sr-only">{likesLabel}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <Icon name="upvote" size={14} />
        <span aria-hidden>{formatNumber(votes, lang)}</span>
        <span className="sr-only">{votesLabel}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <Icon name="star" size={14} />
        {formatStars(stars, lang).replace("★ ", "")}
      </span>
    </span>
  );
}
