"use client";

import Image from "next/image";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import { CARD, CARD_LIFT, CardLink } from "./Card";
import { cn } from "./cn";

export type DistrictCardData = {
  slug: string;
  nameBn: string;
  nameEn: string;
  placeCount: number;
  /** "Famous for" items in the page language; the first two are shown. */
  famousFor?: string[];
};

/**
 * District card (DESIGN.md §4.5): 1:1 locator map, name in both languages, place count and the
 * first two "famous for" items.
 */
export function DistrictCard({
  district,
  href,
  headingLevel = 3,
  className,
}: {
  district: DistrictCardData;
  href?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const bn = contentLocale(locale) === "bn";
  const Heading = `h${headingLevel}` as const;
  const primary = bn ? district.nameBn : district.nameEn;
  const secondary = bn ? district.nameEn : district.nameBn;
  const famous = (district.famousFor ?? []).slice(0, 2);

  return (
    <article className={cn(CARD, CARD_LIFT, "flex-row items-stretch", className)}>
      <div className="w-28 shrink-0 border-r border-border bg-bg p-2 sm:w-32">
        <Image
          src={`/maps/districts/${district.slug}.svg`}
          alt=""
          width={128}
          height={128}
          unoptimized
          className="aspect-square size-full object-contain"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <Heading className="text-h3">
          <CardLink href={href ?? localePath(locale, `/district/${district.slug}`)}>
            {primary}
          </CardLink>
        </Heading>
        <p className="text-sm text-muted" lang={bn ? "en" : "bn"}>
          {secondary}
        </p>
        <p className="num text-sm font-semibold text-primary">
          {t("common.places", { count: district.placeCount })}
        </p>
        {famous.length ? (
          <p className="line-clamp-2 text-sm text-muted">
            <span className="font-semibold text-text">{t("ui.famousFor")}:</span>{" "}
            {famous.join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
