"use client";

import { useState, type ReactNode } from "react";
import { CardGrid } from "@/components/ui/Card";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { useT } from "@/i18n/client";

export type FilterItem = { id: string; division: string; node: ReactNode };
export type DivisionOption = { slug: string; name: string };

/**
 * Division chips (All + 8 divisions) over a set of server-rendered cards. Choosing a chip filters
 * the cards in the browser, with no page load; the server render shows everything.
 */
export function DivisionFilter({
  divisions,
  items,
  label,
  emptyText,
}: {
  divisions: DivisionOption[];
  items: FilterItem[];
  label: string;
  emptyText: string;
}) {
  const t = useT();
  const [division, setDivision] = useState<string | null>(null);
  const shown = division ? items.filter((i) => i.division === division) : items;
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.division, (counts.get(i.division) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-4">
      <ChipRow label={label}>
        <FilterChip selected={division === null} onClick={() => setDivision(null)}>
          {t("common.all")}
        </FilterChip>
        {divisions.map((d) => (
          <FilterChip
            key={d.slug}
            selected={division === d.slug}
            count={counts.get(d.slug) ?? 0}
            onClick={() => setDivision(d.slug)}
          >
            {d.name}
          </FilterChip>
        ))}
      </ChipRow>
      {shown.length ? (
        <CardGrid max={3}>{shown.map((i) => i.node)}</CardGrid>
      ) : (
        <p className="py-6 text-center text-muted">{emptyText}</p>
      )}
    </div>
  );
}
