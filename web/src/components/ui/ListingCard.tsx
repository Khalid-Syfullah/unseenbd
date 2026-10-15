"use client";

import Image from "next/image";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatNumber } from "@/lib/format";
import { CARD, CARD_LIFT } from "./Card";
import { StatusTag } from "./Chip";
import { cn } from "./cn";
import { Icon } from "./Icon";

export type ListingCardData = {
  name: string;
  category: string;
  area: string;
  /** Average rating out of 5. */
  rating?: number | null;
  reviews?: number | null;
  image?: { src: string; alt: string } | null;
  /** Where the photo comes from (shown under the image). */
  imageSource?: string | null;
  sponsored?: boolean;
};

/**
 * Listing card (DESIGN.md §4.5): photo with its source, category tag, ★ rating + reviews, name,
 * area and "View details →", which opens the details dialog. The whole card is that button.
 */
export function ListingCard({
  listing,
  onDetails,
  headingLevel = 3,
  className,
}: {
  listing: ListingCardData;
  onDetails: () => void;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const Heading = `h${headingLevel}` as const;
  return (
    <article
      className={cn(
        CARD,
        CARD_LIFT,
        "has-[[data-card-button]:focus-visible]:outline-3 has-[[data-card-button]:focus-visible]:outline-offset-2 has-[[data-card-button]:focus-visible]:outline-focus",
        className,
      )}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-2">
        {listing.image ? (
          <Image
            src={listing.image.src}
            alt={listing.image.alt}
            fill
            unoptimized
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-subtle">
            <Icon name="camera" size={32} />
          </span>
        )}
        {listing.sponsored ? (
          <StatusTag tone="sponsored" className="absolute top-3 left-3">
            {t("common.sponsored")}
          </StatusTag>
        ) : null}
      </div>
      {listing.imageSource ? (
        <p className="truncate px-4 pt-1.5 text-xs text-muted">
          {t("ui.photoSource")}: {listing.imageSource}
        </p>
      ) : null}
      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag tone="neutral">{listing.category}</StatusTag>
          {listing.rating ? (
            <span className="num inline-flex items-center gap-1 text-sm font-semibold">
              <Icon name="star" size={16} className="text-accent" />
              {formatNumber(listing.rating, lang)}
              {listing.reviews ? (
                <span className="font-normal text-muted">
                  ({t("ui.reviews", { count: listing.reviews })})
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <Heading className="text-h3">{listing.name}</Heading>
        <p className="inline-flex items-center gap-1 text-sm text-muted">
          <Icon name="pin" size={16} />
          {listing.area}
        </p>
        <button
          type="button"
          data-card-button=""
          onClick={onDetails}
          className="mt-auto inline-flex min-h-11 items-center gap-1 self-start font-semibold text-primary outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none"
        >
          {t("ui.viewDetails")}
          <Icon name="arrow-right" size={18} />
          <span className="sr-only">: {listing.name}</span>
        </button>
      </div>
    </article>
  );
}
