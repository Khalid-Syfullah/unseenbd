"use client";

import { useRouter } from "next/navigation";
import { CardGrid } from "@/components/ui/Card";
import { ListingCard } from "@/components/ui/ListingCard";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import type { ListingSummary } from "@/server/data/listings";

/** The label of a listing's category (or kind, for food and products). */
export function useListingLabel() {
  const t = useT();
  return (l: Pick<ListingSummary, "kind" | "category">) =>
    t(
      (l.kind === "business" && l.category
        ? `listings.category.${l.category}`
        : `listings.kind.${l.kind}`) as MessageKey,
    );
}

/** Owner listings as cards; "View details" opens the listing's own page. Sponsored are labelled. */
export function OwnerListingGrid({
  items,
  headingLevel = 3,
}: {
  items: ListingSummary[];
  headingLevel?: 2 | 3 | 4;
}) {
  const router = useRouter();
  const locale = useLocale();
  const label = useListingLabel();
  return (
    <CardGrid max={3}>
      {items.map((l) => (
        <ListingCard
          key={l.id}
          headingLevel={headingLevel}
          listing={{
            name: l.name,
            category: label(l),
            area: [l.area, l.district.name].filter(Boolean).join(", "),
            rating: l.rating,
            reviews: l.reviews || null,
            image: l.photo ? { src: l.photo.thumb ?? l.photo.src, alt: l.name } : null,
            sponsored: l.sponsored,
          }}
          onDetails={() => router.push(localePath(locale, `/listing/${l.id}`))}
        />
      ))}
    </CardGrid>
  );
}
