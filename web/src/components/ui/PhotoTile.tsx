"use client";

import Image from "next/image";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatNumber } from "@/lib/format";
import { CardLink } from "./Card";
import { cn } from "./cn";
import { Icon } from "./Icon";

export type PhotoTileData = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** District (or place) caption. */
  caption: string;
  likes?: number;
  href?: string;
};

/**
 * Photo tile (DESIGN.md §4.5): the photo with a 1 px inner border, its district on a gradient at
 * the bottom and the ♥ count. Keeps the photo's own aspect ratio, for masonry grids.
 */
export function PhotoTile({ photo, className }: { photo: PhotoTileData; className?: string }) {
  const t = useT();
  const lang = contentLocale(useLocale());
  return (
    <figure
      className={cn(
        "group/card relative overflow-hidden rounded-lg bg-surface-2",
        "has-[[data-card-link]:focus-visible]:outline-3 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-focus",
        className,
      )}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        unoptimized
        className="block h-auto w-full transition-transform duration-[var(--dur-3)] ease-standard group-hover/card:scale-[1.02]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-image-edge ring-inset"
      />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-[image:var(--scrim)] px-3 pt-8 pb-2.5 text-sm font-semibold text-on-scrim">
        {photo.href ? (
          <CardLink href={photo.href} className="truncate">
            {photo.caption}
          </CardLink>
        ) : (
          <span className="truncate">{photo.caption}</span>
        )}
        {photo.likes !== undefined ? (
          <span className="num inline-flex shrink-0 items-center gap-1">
            <Icon name="heart" size={16} />
            <span aria-hidden>{formatNumber(photo.likes, lang)}</span>
            <span className="sr-only">{t("ui.likes", { count: photo.likes })}</span>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
