"use client";

import { useState } from "react";
import { CardGrid } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { ListingCard } from "@/components/ui/ListingCard";
import { useT } from "@/i18n/client";
import type { CommunityListing } from "@/server/data/types";

/** Owner listings as cards; "View details" opens a dialog with the description and phone. */
export function ListingGrid({
  listings,
  headingLevel = 3,
}: {
  listings: CommunityListing[];
  headingLevel?: 2 | 3 | 4;
}) {
  const t = useT();
  const [open, setOpen] = useState<CommunityListing | null>(null);
  return (
    <>
      <CardGrid max={3}>
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            headingLevel={headingLevel}
            listing={{
              name: l.name,
              category: l.category ?? l.kind,
              area: l.area ?? "",
              sponsored: l.sponsored,
            }}
            onDetails={() => setOpen(l)}
          />
        ))}
      </CardGrid>
      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.name ?? ""}
        description={[open?.category, open?.area].filter(Boolean).join(" · ")}
      >
        {open?.description ? <p>{open.description}</p> : null}
        {open?.phone ? (
          <p className="mt-3">
            <span className="text-muted">{t("place.listingPhone")}: </span>
            <a href={`tel:${open.phone}`} className="num font-semibold text-primary underline">
              {open.phone}
            </a>
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
