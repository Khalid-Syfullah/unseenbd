"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { Button, TextLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import {
  DistrictSelect,
  Field,
  SearchInput,
  Select,
  Switch,
  type DivisionGroup,
  type SelectOption,
} from "@/components/ui/Form";
import { useT } from "@/i18n/client";

/** The filters of the Explore page, as they appear in the URL. */
export type ExploreValues = {
  q: string;
  /** District slug, or "". */
  district: string;
  /** Place type key, or "". */
  kind: string;
  /** Month number as text ("1"–"12"), or "". */
  month: string;
  unseen: boolean;
};

export type ExploreShellProps = {
  /** The page's own public path, with the locale. */
  base: string;
  values: ExploreValues;
  districtGroups: DivisionGroup[];
  kinds: SelectOption[];
  months: SelectOption[];
  /** Places per district slug, for the map tooltip. */
  placeCounts: Record<string, number>;
  /** The server-rendered results. */
  children: ReactNode;
};

/** The query string for a set of filters: empty values are left out and `page` is dropped. */
export function exploreQuery(values: ExploreValues): string {
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.district) params.set("district", values.district);
  if (values.kind) params.set("kind", values.kind);
  if (values.month) params.set("month", values.month);
  if (values.unseen) params.set("unseen", "1");
  return params.toString();
}

/**
 * Explore's filters and map. Every change goes to the URL (`?q=&district=&kind=&month=&unseen=1`)
 * and the server renders the results again, so a reload, a shared link and Back / Forward all
 * show the same list. Wide screens put the map in a sticky column at the left of the results.
 */
export function ExploreShell({
  base,
  values,
  districtGroups,
  kinds,
  months,
  placeCounts,
  children,
}: ExploreShellProps) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showMap, setShowMap] = useState(true);

  // The text box follows the URL when it changes from outside (Back, Forward, Clear filters).
  const [q, setQ] = useState(values.q);
  const [seenQ, setSeenQ] = useState(values.q);
  if (values.q !== seenQ) {
    setSeenQ(values.q);
    setQ(values.q);
  }

  function go(changes: Partial<ExploreValues>) {
    const query = exploreQuery({ ...values, ...changes });
    startTransition(() => {
      router.push(query ? `${base}?${query}` : base, { scroll: false });
    });
  }

  const active = Boolean(
    values.q || values.district || values.kind || values.month || values.unseen,
  );

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label={t("explore.filters")} className="flex flex-col gap-4">
        <SearchInput
          value={q}
          onValueChange={setQ}
          onSearch={(value) => go({ q: value.trim() })}
          label={t("explore.searchLabel")}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label={t("common.district")} htmlFor="explore-district">
            <DistrictSelect
              id="explore-district"
              divisions={districtGroups}
              placeholder={t("explore.allDistricts")}
              value={values.district}
              onChange={(e) => go({ district: e.target.value })}
            />
          </Field>
          <Field label={t("common.kind")} htmlFor="explore-kind">
            <Select
              id="explore-kind"
              options={kinds}
              placeholder={t("explore.allKinds")}
              value={values.kind}
              onChange={(e) => go({ kind: e.target.value })}
            />
          </Field>
          <Field
            label={t("common.month")}
            htmlFor="explore-month"
            className="col-span-2 md:col-span-1"
          >
            <Select
              id="explore-month"
              options={months}
              placeholder={t("explore.allMonths")}
              value={values.month}
              onChange={(e) => go({ month: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Switch
            checked={values.unseen}
            onChange={(on) => go({ unseen: on })}
            label={t("common.onlyUnseen")}
          />
          <div className="flex items-center gap-2">
            {active ? (
              <TextLink href={base} scroll={false}>
                {t("common.clearFilters")}
              </TextLink>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={showMap}
              onClick={() => setShowMap((v) => !v)}
            >
              {showMap ? t("explore.hideMap") : t("explore.showMap")}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-6",
          showMap && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start",
        )}
      >
        {showMap ? (
          <div className="flex flex-col gap-2 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:max-h-[calc(100dvh-var(--header-h)-2rem)] lg:overflow-y-auto">
            <BangladeshMap
              className="mx-auto"
              label={t("explore.mapLabel")}
              selected={values.district || null}
              onSelect={(slug) => go({ district: slug === values.district ? "" : slug })}
              labelToggle
              placeCounts={placeCounts}
            />
            <p className="text-center text-sm text-muted">{t("explore.mapHint")}</p>
          </div>
        ) : null}
        <div
          aria-busy={pending}
          className={cn(
            "min-w-0 transition-opacity duration-[var(--dur-2)]",
            pending && "opacity-60",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
