"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { CardGrid } from "@/components/ui/Card";
import { ChipRow, FilterChip, StatusTag } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { ListingCard } from "@/components/ui/ListingCard";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { googleMapsUrl } from "@/lib/directory";
import { formatNumber } from "@/lib/format";
import type { DirectoryItem } from "@/server/data/listings";

export type DirectoryGroup = { id: string; title: string; items: DirectoryItem[] };

/** Where the seeded snapshot's ratings come from, shown as the photo/credit source. */
const SOURCE = "Google Maps";

/**
 * One or more groups of seeded directory items (hotels and resorts on `/stay`, one group on the
 * other pages). Each group has area chips, a card grid and a details dialog with the category,
 * area, rating, review count, the source credit and "Open in Google Maps".
 */
export function DirectoryBrowser({ groups }: { groups: DirectoryGroup[] }) {
  return (
    <div className="flex flex-col gap-10">
      {groups.map((g) => (
        <Group key={g.id} group={g} />
      ))}
    </div>
  );
}

function Group({ group }: { group: DirectoryGroup }) {
  const t = useT();
  const [chip, setChip] = useState<string | null>(null);
  const [open, setOpen] = useState<DirectoryItem | null>(null);

  const chips: { key: string; label: string; count: number }[] = [];
  for (const item of group.items) {
    const found = chips.find((c) => c.key === item.chip);
    if (found) found.count += 1;
    else chips.push({ key: item.chip, label: item.chipLabel, count: 1 });
  }
  const shown = chip ? group.items.filter((i) => i.chip === chip) : group.items;
  const headingId = `dir-${group.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-h2">
        {group.title}
      </h2>
      {chips.length > 1 ? (
        <ChipRow label={t("directory.areas")}>
          <FilterChip selected={chip === null} onClick={() => setChip(null)}>
            {t("directory.allAreas")}
          </FilterChip>
          {chips.map((c) => (
            <FilterChip
              key={c.key}
              selected={chip === c.key}
              count={c.count}
              onClick={() => setChip(chip === c.key ? null : c.key)}
            >
              {c.label}
            </FilterChip>
          ))}
        </ChipRow>
      ) : null}
      <CardGrid max={3}>
        {shown.map((item) => (
          <ListingCard
            key={item.id}
            headingLevel={3}
            listing={{
              name: item.name,
              category: item.category,
              area: item.area,
              rating: item.rating,
              reviews: item.reviews,
              imageSource: SOURCE,
            }}
            onDetails={() => setOpen(item)}
          />
        ))}
      </CardGrid>
      <DirectoryDialog item={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function DirectoryDialog({ item, onClose }: { item: DirectoryItem | null; onClose: () => void }) {
  const t = useT();
  const lang = contentLocale(useLocale());
  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title={item?.name ?? ""}
      description={item ? [item.category, item.area].filter(Boolean).join(" · ") : undefined}
      footer={
        item ? (
          <ButtonLink
            href={googleMapsUrl(item.name, item.areaBn)}
            target="_blank"
            rel="noopener noreferrer"
            icon="pin"
            trailingIcon="external"
          >
            {t("directory.openMaps")}
          </ButtonLink>
        ) : null
      }
    >
      {item ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted">{t("directory.category")}</dt>
          <dd>
            <StatusTag tone="neutral">{item.category}</StatusTag>
          </dd>
          <dt className="text-muted">{t("directory.area")}</dt>
          <dd>{item.area}</dd>
          {item.rating ? (
            <>
              <dt className="text-muted">{t("directory.rating")}</dt>
              <dd className="num inline-flex items-center gap-1 font-semibold">
                <Icon name="star" size={16} className="text-accent" />
                {formatNumber(item.rating, lang)}
              </dd>
            </>
          ) : null}
          {item.reviews ? (
            <>
              <dt className="text-muted">{t("directory.reviews")}</dt>
              <dd className="num">{t("ui.reviews", { count: item.reviews })}</dd>
            </>
          ) : null}
          <dt className="text-muted">{t("ui.photoSource")}</dt>
          <dd>{SOURCE}</dd>
        </dl>
      ) : null}
      {item ? <p className="mt-4 text-sm text-muted">{t("directory.snapshotNote")}</p> : null}
    </Dialog>
  );
}
