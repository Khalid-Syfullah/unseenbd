"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { CardMakerLazy } from "@/components/card";
import { PageSection } from "@/components/discovery/PageHeader";
import { WorldMap } from "@/components/maps/WorldMap";
import { Button, IconButton, LinkButton } from "@/components/ui/Button";
import { CARD } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/Chip";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { Field, SearchInput, SegmentedControl, Select, TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatDate, formatNumber } from "@/lib/format";
import {
  addPin,
  clearWorld,
  cleanName,
  MAX_PIN_NOTE,
  removePin,
  setCountryMark,
  useMemoryPins,
  useShareName,
  useWorldMarks,
  worldSharePath,
  type WorldMark,
} from "@/lib/visited";
import { CardMakerSlot } from "./Extras";
import { ShareButtons, ShareNameField, SharePanelCard } from "./ShareTools";
import { searchKey } from "./types";
import { CONTINENT_LABEL, continentCounts, COUNTRIES, countMarks } from "./world-data";

type Mode = WorldMark | "clear";

/**
 * Orders names without Intl, so the server render and the browser agree (code-point order is
 * alphabetical for both the Latin and the Bengali alphabet).
 */
function byName(a: string, b: string): number {
  const x = searchKey(a);
  const y = searchKey(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * The /world page body (FEATURES.md §5.7): the world map with Visited / Want to go / Clear modes,
 * totals and per-continent counts, country search and the full list with toggle buttons, a share
 * link, travel memory pins and the image maker (the same card engine as My Bangladesh). Marks and pins live in this browser.
 */
export function MyWorld() {
  const t = useT();
  const locale = useLocale();
  const bn = contentLocale(locale) === "bn";
  const marks = useWorldMarks();
  const [mode, setMode] = useState<Mode>("visited");
  const [query, setQuery] = useState("");
  const name = cleanName(useShareName());
  const n = (value: number) => formatNumber(value, locale);

  const totals = countMarks(marks);
  const continents = continentCounts(marks);
  const countryName = (c: (typeof COUNTRIES)[number]) => (bn ? c.nameBn : c.nameEn);

  const sorted = useMemo(
    () => [...COUNTRIES].sort((a, b) => byName(bn ? a.nameBn : a.nameEn, bn ? b.nameBn : b.nameEn)),
    [bn],
  );
  const shown = useMemo(() => {
    const q = searchKey(query);
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.nameEn, c.nameBn, c.key].some((text) => searchKey(text).includes(q)),
    );
  }, [sorted, query]);

  function clearAll() {
    if (window.confirm(t("world.clearConfirm"))) clearWorld();
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn(CARD, "gap-1 p-4 md:p-5")}>
          <p className="num font-display text-display leading-none text-primary">
            {n(totals.visited)}
          </p>
          <p className="text-sm text-muted" aria-live="polite">
            {t("world.visitedCount", { count: totals.visited })}
          </p>
        </div>
        <div className={cn(CARD, "gap-1 p-4 md:p-5")}>
          <p className="num font-display text-display leading-none text-sun">{n(totals.wish)}</p>
          <p className="text-sm text-muted" aria-live="polite">
            {t("world.wishCount", { count: totals.wish })}
          </p>
        </div>
      </div>

      <section aria-label={t("map.world")} className="flex flex-col gap-3">
        <SegmentedControl<Mode>
          label={t("world.modeLabel")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "visited", label: t("world.modeVisited") },
            { value: "wish", label: t("world.modeWish") },
            { value: "clear", label: t("world.modeClear") },
          ]}
          className="max-w-[480px]"
        />
        <WorldMap value={marks} mark={mode} onChange={setCountryMark} legend />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-subtle">{t("map.worldCredit")}</p>
          {totals.visited + totals.wish ? (
            <LinkButton icon="close" className="text-danger" onClick={clearAll}>
              {t("world.clearAll")}
            </LinkButton>
          ) : null}
        </div>
      </section>

      <PageSection id="continents" title={t("world.continentsTitle")}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {continents.map((c) => (
            <li key={c.key} className={cn(CARD, "gap-1 p-4")}>
              <span className="font-semibold">{t(CONTINENT_LABEL[c.key])}</span>
              <span className="num text-sm">
                {t("world.continentLine", { visited: c.visited, total: c.total })}
              </span>
              <span className="num text-sm text-muted">
                {t("world.continentWish", { count: c.wish })}
              </span>
              <span
                aria-hidden
                className="mt-1 block h-1.5 overflow-hidden rounded-pill bg-surface-2"
              >
                <span
                  className="block h-full rounded-pill bg-primary"
                  style={{ width: `${c.total ? Math.round((c.visited / c.total) * 100) : 0}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection
        id="countries"
        title={t("world.listTitle")}
        aside={
          <span className="num text-sm text-muted">
            {t("world.listCount", { count: COUNTRIES.length })}
          </span>
        }
      >
        <SearchInput
          value={query}
          onValueChange={setQuery}
          onSearch={setQuery}
          label={t("world.searchLabel")}
          placeholder={t("world.searchPlaceholder")}
          className="max-w-[560px]"
        />
        {shown.length ? (
          <ul className="max-h-[560px] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-raised">
            {shown.map((c) => {
              const mark = marks[c.key];
              return (
                <li
                  key={c.key}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2"
                >
                  <span className="min-w-0 font-semibold">{countryName(c)}</span>
                  <span role="group" aria-label={countryName(c)} className="flex gap-2">
                    <FilterChip
                      icon="check"
                      selected={mark === "visited"}
                      onClick={() => setCountryMark(c.key, mark === "visited" ? null : "visited")}
                    >
                      {t("map.visited")}
                    </FilterChip>
                    <FilterChip
                      icon="heart"
                      selected={mark === "wish"}
                      onClick={() => setCountryMark(c.key, mark === "wish" ? null : "wish")}
                    >
                      {t("map.wish")}
                    </FilterChip>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted" role="status">
            {t("world.searchEmpty", { query: query.trim() })}
          </p>
        )}
      </PageSection>

      <SharePanelCard id="share" title={t("world.shareTitle")}>
        <ShareNameField />
        <ShareButtons
          title={t("world.title")}
          text={t("world.shareText", { count: totals.visited })}
          link={() => worldSharePath(locale, marks, name)}
          disabled={totals.visited + totals.wish === 0}
        />
        {totals.visited + totals.wish === 0 ? (
          <p className="text-sm font-semibold">{t("world.shareEmpty")}</p>
        ) : null}
        <p className="text-sm text-muted">{t("world.privacy")}</p>
      </SharePanelCard>

      <MemoryPins />

      <CardMakerSlot id="image-maker" title={t("world.imageTitle")}>
        <CardMakerLazy map="world" />
      </CardMakerSlot>
    </div>
  );
}

/** Travel memories: country, date and a note, newest first; kept in this browser. */
function MemoryPins() {
  const t = useT();
  const locale = useLocale();
  const bn = contentLocale(locale) === "bn";
  const toast = useToast();
  const uid = useId();
  const pins = useMemoryPins();
  const [country, setCountry] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const byKey = useMemo(() => new Map(COUNTRIES.map((c) => [c.key, c])), []);
  const options = useMemo(
    () =>
      [...COUNTRIES]
        .map((c) => ({ value: c.key, label: bn ? c.nameBn : c.nameEn }))
        .sort((a, b) => byName(a.label, b.label)),
    [bn],
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!country) {
      setError(t("world.pinNeedCountry"));
      return;
    }
    if (!addPin({ country, date, note })) {
      setError(t("world.pinsFull"));
      return;
    }
    setError(null);
    setNote("");
    setDate("");
    toast.show(t("world.pinAdded"), { tone: "success" });
  }

  return (
    <PageSection id="memories" title={t("world.pinsTitle")}>
      <p className="text-muted">{t("world.pinsIntro")}</p>
      <form
        onSubmit={submit}
        noValidate
        className={cn(
          CARD,
          "grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[1fr_200px_2fr_auto]",
        )}
      >
        <Field label={t("world.pinCountry")} htmlFor={`${uid}-country`} error={error}>
          <Select
            id={`${uid}-country`}
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setError(null);
            }}
            placeholder={t("world.pinCountry")}
            options={options}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${uid}-country-error` : undefined}
          />
        </Field>
        <Field label={t("world.pinDate")} htmlFor={`${uid}-date`}>
          <TextInput
            id={`${uid}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label={t("world.pinNote")} htmlFor={`${uid}-note`}>
          <TextInput
            id={`${uid}-note`}
            value={note}
            maxLength={MAX_PIN_NOTE}
            placeholder={t("world.pinNotePlaceholder")}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" icon="pin" className="w-full lg:w-auto">
            {t("world.pinAdd")}
          </Button>
        </div>
      </form>
      {pins.length ? (
        <ul className="flex flex-col gap-2">
          {pins.map((pin) => {
            const c = byKey.get(pin.country);
            return (
              <li key={pin.id} className={cn(CARD, "flex-row items-start gap-3 p-4")}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-primary-wash text-primary">
                  <Icon name="pin" size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">
                    {c ? (bn ? c.nameBn : c.nameEn) : pin.country}
                  </span>
                  {pin.date ? (
                    <span className="num text-sm text-muted">{formatDate(pin.date, locale)}</span>
                  ) : null}
                  {pin.note ? <p className="mt-1 break-words">{pin.note}</p> : null}
                </div>
                <IconButton
                  icon="close"
                  label={t("world.pinRemove")}
                  onClick={() => removePin(pin.id)}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted">{t("world.pinsEmpty")}</p>
      )}
    </PageSection>
  );
}
