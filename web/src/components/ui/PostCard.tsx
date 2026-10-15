"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatDate, formatNumber, localizeDigits, starScore } from "@/lib/format";
import { Avatar } from "./Avatar";
import { CARD } from "./Card";
import { cn } from "./cn";
import { Icon } from "./Icon";

export type PostCardData = {
  author: string;
  /** Link to the author's public profile. */
  authorHref?: string;
  /** ISO date or date-time. */
  date: string;
  text: string;
  photos?: { src: string; alt: string }[];
  likes: number;
  /** Editorial-style score 0–1000 (shown ★ x/10); omit when unrated. */
  stars?: number;
  comments: number;
  liked?: boolean;
  /** The viewer's own ★ rating (1–10), when they rated it. */
  myRating?: number | null;
};

const ACTION =
  "relative inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-muted tap-target " +
  "transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2 hover:text-text";

/**
 * Post card (DESIGN.md §4.5): avatar + name + date, text clamped to 6 lines with "Read more",
 * photo grid (1 / 2 / 3+), and the action row 👍 · ★ x/10 · Share · Comments (n).
 */
export function PostCard({
  post,
  onLike,
  onRate,
  onShare,
  onComments,
  headerExtra,
  children,
  className,
}: {
  post: PostCardData;
  onLike?: () => void;
  /** Makes the ★ score a button (opens the rating picker). */
  onRate?: () => void;
  onShare?: () => void;
  onComments?: () => void;
  /** Shown at the right of the header (status tag, menu). */
  headerExtra?: ReactNode;
  /** Shown under the action row (comments, owner actions). */
  children?: ReactNode;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const [expanded, setExpanded] = useState(false);
  const textId = useId();
  const photos = post.photos ?? [];
  const shown = photos.slice(0, 3);
  const long = post.text.length > 280 || post.text.split("\n").length > 6;

  return (
    <article className={cn(CARD, "gap-3 p-4", className)}>
      <header className="flex items-center gap-3">
        <Avatar name={post.author} />
        <div className="flex min-w-0 flex-1 flex-col">
          {post.authorHref ? (
            <Link
              href={post.authorHref}
              className="truncate font-semibold underline-offset-4 hover:text-primary hover:underline"
            >
              {post.author}
            </Link>
          ) : (
            <span className="truncate font-semibold">{post.author}</span>
          )}
          <time dateTime={post.date} className="text-sm text-muted">
            {formatDate(post.date, lang)}
          </time>
        </div>
        {headerExtra}
      </header>

      <div>
        <p id={textId} className={cn("whitespace-pre-line", !expanded && "line-clamp-6")}>
          {post.text}
        </p>
        {long ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded((v) => !v)}
            className="relative min-h-11 font-semibold text-primary hover:underline"
          >
            {expanded ? t("common.showLess") : t("ui.readMore")}
          </button>
        ) : null}
      </div>

      {shown.length ? (
        <div
          className={cn(
            "grid gap-1 overflow-hidden rounded-md",
            shown.length === 1 && "aspect-[3/2] grid-cols-1",
            shown.length === 2 && "aspect-[2/1] grid-cols-2",
            shown.length >= 3 && "aspect-[3/2] grid-cols-2 grid-rows-2",
          )}
        >
          {shown.map((photo, i) => (
            <div
              key={photo.src}
              className={cn(
                "relative overflow-hidden bg-surface-2",
                shown.length >= 3 && i === 0 && "row-span-2",
              )}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                unoptimized
                sizes="(min-width: 768px) 360px, 100vw"
                className="object-cover"
              />
              {i === 2 && photos.length > 3 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-overlay text-h2 text-on-scrim">
                  +{localizeDigits(photos.length - 3, lang)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <footer className="-mx-2 flex flex-wrap items-center gap-x-1 border-t border-border pt-2">
        <button
          type="button"
          aria-pressed={post.liked ?? false}
          onClick={onLike}
          className={ACTION}
        >
          <span aria-hidden>👍</span>
          <span className="num" aria-hidden>
            {formatNumber(post.likes, lang)}
          </span>
          <span className="sr-only">{t("ui.likes", { count: post.likes })}</span>
        </button>
        {onRate ? (
          <button
            type="button"
            onClick={onRate}
            aria-pressed={Boolean(post.myRating)}
            className={cn(ACTION, "num")}
          >
            <Icon name="star" size={16} className="text-accent" />
            {post.stars !== undefined ? (
              <>
                <span aria-hidden>{localizeDigits(`${starScore(post.stars)}/10`, lang)}</span>
                <span className="sr-only">
                  {t("ui.rating", { score: starScore(post.stars) })}.{" "}
                  {post.myRating
                    ? t("community.yourRating", { score: post.myRating })
                    : t("community.rate")}
                </span>
              </>
            ) : (
              t("community.rate")
            )}
          </button>
        ) : post.stars !== undefined ? (
          <span className="num inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted">
            <Icon name="star" size={16} className="text-accent" />
            <span aria-hidden>{localizeDigits(`${starScore(post.stars)}/10`, lang)}</span>
            <span className="sr-only">{t("ui.rating", { score: starScore(post.stars) })}</span>
          </span>
        ) : null}
        <button type="button" onClick={onShare} className={ACTION}>
          <Icon name="share" size={18} />
          {t("common.share")}
        </button>
        <button type="button" onClick={onComments} className={cn(ACTION, "ml-auto")}>
          <Icon name="comment" size={18} />
          {t("ui.comments", { count: post.comments })}
        </button>
      </footer>
      {children}
    </article>
  );
}
