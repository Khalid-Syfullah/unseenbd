"use client";

import { useMemo, useState } from "react";
import { PageSection } from "@/components/discovery/PageHeader";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/Chip";
import { SearchInput } from "@/components/ui/Form";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { setDistrictsVisited, setDistrictVisited, TOTAL_DISTRICTS } from "@/lib/visited";
import { searchKey, type MyDistrict, type MyDivision } from "./types";

function DistrictChip({ district, visited }: { district: MyDistrict; visited: boolean }) {
  return (
    <FilterChip
      selected={visited}
      icon={visited ? "check" : undefined}
      onClick={() => setDistrictVisited(district.id, !visited)}
    >
      {district.name}
    </FilterChip>
  );
}

/**
 * "Pick your districts": a search box, then the eight divisions, each with "Whole division" and
 * a chip per district (a toggle button: `aria-pressed` = visited).
 */
export function DistrictPicker({
  divisions,
  visited,
}: {
  divisions: MyDivision[];
  visited: ReadonlySet<number>;
}) {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const n = (value: number) => formatNumber(value, locale);

  const all = useMemo(() => divisions.flatMap((d) => d.districts), [divisions]);
  const matches = useMemo(() => {
    const q = searchKey(query);
    if (!q) return null;
    return all.filter((d) =>
      [d.nameBn, d.nameEn, d.slug].some((name) => searchKey(name).includes(q)),
    );
  }, [all, query]);

  return (
    <PageSection
      id="pick"
      title={t("myBd.pickTitle")}
      aside={
        <span className="num text-sm font-semibold text-muted">
          {n(visited.size)}/{n(TOTAL_DISTRICTS)}
        </span>
      }
    >
      <SearchInput
        value={query}
        onValueChange={setQuery}
        onSearch={setQuery}
        label={t("myBd.searchLabel")}
        placeholder={t("myBd.searchPlaceholder")}
        className="max-w-[560px]"
      />
      {matches ? (
        <div role="group" aria-label={t("myBd.searchResults")} className="flex flex-wrap gap-2">
          {matches.length ? (
            matches.map((d) => <DistrictChip key={d.id} district={d} visited={visited.has(d.id)} />)
          ) : (
            <p className="text-muted" role="status">
              {t("myBd.searchEmpty", { query: query.trim() })}
            </p>
          )}
        </div>
      ) : null}

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {divisions.map((division) => {
          const ids = division.districts.map((d) => d.id);
          const done = ids.filter((id) => visited.has(id)).length;
          const whole = done === ids.length;
          const headingId = `division-${division.slug}`;
          return (
            <div
              key={division.slug}
              role="group"
              aria-labelledby={headingId}
              className="flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <h3 id={headingId} className="text-h3">
                  {division.name}{" "}
                  <span className="num font-normal text-muted">
                    {n(done)}/{n(ids.length)}
                  </span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={whole ? "close" : "check"}
                  aria-label={`${whole ? t("myBd.clearDivision") : t("myBd.wholeDivision")}: ${division.name}`}
                  onClick={() => setDistrictsVisited(ids, !whole)}
                >
                  {whole ? t("myBd.clearDivision") : t("myBd.wholeDivision")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {division.districts.map((d) => (
                  <DistrictChip key={d.id} district={d} visited={visited.has(d.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}
