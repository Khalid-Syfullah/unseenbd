"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CardGrid } from "@/components/ui/Card";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import type { PlacePage, PlaceSummary } from "@/server/data/types";
import type { DivisionOption } from "./DivisionFilter";

/**
 * The places that are good this month, with division chips. The server renders the first nine
 * (all divisions); choosing a division loads that division's nine from `/api/places` and swaps
 * the grid in place.
 */
export function MonthPlaces({
  month,
  divisions,
  initial,
  pageSize = 9,
  label,
  emptyText,
  errorText,
}: {
  month: number;
  divisions: DivisionOption[];
  /** The server-rendered cards for "All". */
  initial: ReactNode;
  pageSize?: number;
  label: string;
  emptyText: string;
  errorText: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const [division, setDivision] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceSummary[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const cache = useRef(new Map<string, PlaceSummary[]>());

  useEffect(() => {
    if (division === null) return;
    const hit = cache.current.get(division);
    if (hit) {
      setPlaces(hit);
      setState("idle");
      return;
    }
    const controller = new AbortController();
    setState("loading");
    const query = new URLSearchParams({
      month: String(month),
      division,
      pageSize: String(pageSize),
      lang,
    });
    fetch(`/api/places?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<PlacePage>;
      })
      .then((page) => {
        cache.current.set(division, page.items);
        setPlaces(page.items);
        setState("idle");
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError") setState("error");
      });
    return () => controller.abort();
  }, [division, month, pageSize, lang]);

  function choose(next: string | null) {
    setDivision(next);
    if (next === null) setState("idle");
  }

  const showInitial = division === null;
  return (
    <div className="flex flex-col gap-4">
      <ChipRow label={label}>
        <FilterChip selected={division === null} onClick={() => choose(null)}>
          {t("common.all")}
        </FilterChip>
        {divisions.map((d) => (
          <FilterChip key={d.slug} selected={division === d.slug} onClick={() => choose(d.slug)}>
            {d.name}
          </FilterChip>
        ))}
      </ChipRow>
      <div aria-live="polite" aria-busy={state === "loading"}>
        {state === "error" ? (
          <p className="py-6 text-center text-muted">{errorText}</p>
        ) : showInitial ? (
          <CardGrid max={3}>{initial}</CardGrid>
        ) : places && places.length === 0 && state === "idle" ? (
          <p className="py-6 text-center text-muted">{emptyText}</p>
        ) : (
          <CardGrid max={3} className={state === "loading" ? "opacity-60" : undefined}>
            {(places ?? []).map((p) => (
              <PlaceCard key={p.slug} place={p} />
            ))}
          </CardGrid>
        )}
      </div>
    </div>
  );
}
