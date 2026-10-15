"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Card, StatTile } from "@/components/ui/Card";
import { isKind, KindBadge, StatusTag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { Checkbox, Field, Select, Stepper, Switch, type SelectGroup } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { useLocale, useT } from "@/i18n/client";
import { localePath, type Locale } from "@/i18n/locales";
import { formatDistance, formatDuration, formatMoney, formatNumber } from "@/lib/format";
import { buildPlan } from "@/lib/planner/plan";
import { MAX_DESTINATIONS, MAX_PEOPLE, MIN_PEOPLE } from "@/lib/planner/constants";
import type { Plan, PlanDay, PlanInput, PlanItem } from "@/lib/planner/types";
import { districtResolver, parsePlanQuery, planQuery } from "@/lib/planner/url";
import { shareOrCopy } from "@/lib/share";
import { useAccount } from "@/lib/account/client";
import { saveTrip, tripPayload } from "@/lib/trips";
import type { PlannerDistrictInfo, PlannerDivision, PlannerPlaceInfo } from "@/server/data/planner";
import { RouteMap } from "./RouteMap";
import { CostTable, LevelControl, useNumberLang } from "./shared";

/** The last plan, kept in the visitor's browser so "Add to trip plan" can add to it. */
export const PLAN_DRAFT_KEY = "unseenbd.plan";

function readDraft(): string | null {
  try {
    return window.localStorage.getItem(PLAN_DRAFT_KEY);
  } catch {
    return null;
  }
}

function writeDraft(query: string | null): void {
  try {
    if (query) window.localStorage.setItem(PLAN_DRAFT_KEY, query);
    else window.localStorage.removeItem(PLAN_DRAFT_KEY);
  } catch {
    // private window or blocked storage: the URL still holds the plan
  }
}

export type PlannerProps = {
  divisions: PlannerDivision[];
  districts: PlannerDistrictInfo[];
  places: PlannerPlaceInfo[];
  /** State from the URL. */
  initial: PlanInput;
  /** Districts the URL asked to add (`?add=`); merged into the saved plan when there is one. */
  initialAdd: number[];
  /** The "Sample: Dhaka → Cox's Bazar" plan. */
  sample: PlanInput;
};

/** The trip planner (MASTER_PROMPT §5.4, DESIGN.md §4.9 and §5.5). */
export function Planner({
  divisions,
  districts,
  places,
  initial,
  initialAdd,
  sample,
}: PlannerProps) {
  const t = useT();
  const [input, setInput] = useState<PlanInput>(initial);
  const data = useMemo(() => ({ districts, places }), [districts, places]);
  const plan = useMemo(() => buildPlan(input, data), [input, data]);
  const resolve = useMemo(() => districtResolver(districts), [districts]);

  // "Add to trip plan" from the calculator adds to the plan the visitor already has, if any.
  const merged = useRef(false);
  useEffect(() => {
    if (merged.current || !initialAdd.length) return;
    merged.current = true;
    const raw = readDraft();
    if (!raw) return;
    const { add, ...draft } = parsePlanQuery(new URLSearchParams(raw), {
      resolve,
      defaultStart: initial.start,
    });
    void add; // a saved draft never carries `add`
    if (!draft.destinations.length) return;
    const destinations = [...new Set([...draft.destinations, ...initialAdd])]
      .filter((id) => id !== draft.start)
      .slice(0, MAX_DESTINATIONS);
    setInput({ ...draft, destinations });
  }, [initialAdd, initial.start, resolve]);

  // Mirror the state in the URL (shareable) and remember it for "Add to trip plan".
  const query = planQuery(input);
  const firstRun = useRef(true);
  useEffect(() => {
    const skip = firstRun.current && !initialAdd.length;
    firstRun.current = false;
    if (skip) return;
    const url = `${window.location.pathname}?${query}`;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(window.history.state, "", url);
    }
    writeDraft(input.destinations.length ? query : null);
  }, [query, input.destinations.length, initialAdd.length]);

  const update = (patch: Partial<PlanInput>) => setInput((s) => ({ ...s, ...patch }));

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <PlanForm
        divisions={divisions}
        districts={districts}
        places={places}
        input={input}
        update={update}
        onSample={() => setInput(sample)}
      />
      <div className="flex min-w-0 flex-col gap-6">
        {plan ? (
          <PlanResults plan={plan} districts={districts} places={places} />
        ) : (
          <EmptyState
            illustration="planner"
            body={t("plan.empty")}
            className="print:hidden"
            action={
              <Button variant="primary" icon="planner" onClick={() => setInput(sample)}>
                {t("plan.sample")}
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

/* Form ---------------------------------------------------------------------------------------- */

function PlanForm({
  divisions,
  districts,
  places,
  input,
  update,
  onSample,
}: {
  divisions: PlannerDivision[];
  districts: PlannerDistrictInfo[];
  places: PlannerPlaceInfo[];
  input: PlanInput;
  update: (patch: Partial<PlanInput>) => void;
  onSample: () => void;
}) {
  const t = useT();
  const lang = useNumberLang();
  const id = useId();
  const byId = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const chosen = new Set(input.destinations);

  const groups = (disable: (id: number) => boolean): SelectGroup[] =>
    divisions.map((dv) => ({
      label: dv.name,
      options: dv.districts.map((d) => ({
        value: String(d.id),
        label: d.name,
        disabled: disable(d.id),
      })),
    }));

  const setStart = (start: number) =>
    update({ start, destinations: input.destinations.filter((d) => d !== start) });
  const add = (dest: number) => {
    if (dest === input.start || chosen.has(dest) || input.destinations.length >= MAX_DESTINATIONS) {
      return;
    }
    update({ destinations: [...input.destinations, dest] });
  };
  const remove = (dest: number) =>
    update({
      destinations: input.destinations.filter((d) => d !== dest),
      places: input.places.filter((p) => places.find((x) => x.id === p)?.districtId !== dest),
    });
  const moveEarlier = (i: number) => {
    const next = [...input.destinations];
    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
    update({ destinations: next });
  };
  const togglePlace = (placeId: number, on: boolean) =>
    update({
      places: on ? [...input.places, placeId] : input.places.filter((p) => p !== placeId),
    });

  return (
    <form
      aria-label={t("plan.formTitle")}
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-5 rounded-lg border border-border bg-raised p-4 shadow-1 md:p-5 lg:sticky lg:top-[calc(var(--header-h)+16px)] print:hidden"
    >
      <h2 className="text-h3">{t("plan.formTitle")}</h2>

      <Field label={t("plan.start")} htmlFor={`${id}-start`}>
        <Select
          id={`${id}-start`}
          value={String(input.start)}
          groups={groups(() => false)}
          onChange={(e) => setStart(Number(e.target.value))}
        />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold">{t("plan.destinations")}</legend>
        {input.destinations.length ? (
          <ul className="flex flex-wrap gap-2">
            {input.destinations.map((dest, i) => {
              const name = byId.get(dest)?.name ?? String(dest);
              return (
                <li
                  key={dest}
                  className="inline-flex h-9 items-center gap-0.5 rounded-pill border-[1.5px] border-primary bg-primary-wash pl-3 text-sm font-semibold text-primary"
                >
                  {input.optimize ? null : (
                    <span aria-hidden className="num mr-1 text-xs text-muted">
                      {formatNumber(i + 1, lang)}
                    </span>
                  )}
                  <span>{name}</span>
                  {!input.optimize && i > 0 ? (
                    <button
                      type="button"
                      aria-label={t("plan.moveEarlier", { name })}
                      onClick={() => moveEarlier(i)}
                      className="tap-target relative inline-flex size-8 items-center justify-center rounded-pill hover:bg-raised"
                    >
                      <Icon name="arrow-left" size={16} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label={t("plan.remove", { name })}
                    onClick={() => remove(dest)}
                    className="tap-target relative mr-0.5 inline-flex size-8 items-center justify-center rounded-pill hover:bg-raised"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("plan.noDestinations")}</p>
        )}
        <Field label={t("plan.addDestination")} htmlFor={`${id}-add`} hideLabel>
          <Select
            id={`${id}-add`}
            value=""
            placeholder={`+ ${t("plan.addDestination")}`}
            groups={groups((d) => d === input.start || chosen.has(d))}
            disabled={input.destinations.length >= MAX_DESTINATIONS}
            onChange={(e) => {
              if (e.target.value) add(Number(e.target.value));
            }}
          />
        </Field>
        {input.destinations.map((dest) => (
          <PlacePicker
            key={dest}
            district={byId.get(dest)}
            places={places.filter((p) => p.districtId === dest)}
            picked={input.places}
            onToggle={togglePlace}
          />
        ))}
      </fieldset>

      <div className="flex flex-col gap-1">
        <Switch
          checked={input.optimize}
          onChange={(optimize) => update({ optimize })}
          label={t("plan.optimize")}
        />
        <Switch
          checked={input.returnToStart}
          onChange={(returnToStart) => update({ returnToStart })}
          label={t("plan.returnToStart")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold" aria-hidden>
          {t("plan.travellers")}
        </span>
        <Stepper
          label={t("plan.travellers")}
          value={input.people}
          min={MIN_PEOPLE}
          max={MAX_PEOPLE}
          onChange={(people) => update({ people })}
        />
      </div>

      <LevelControl value={input.level} onChange={(level) => update({ level })} />

      <Button variant="ghost" icon="planner" className="self-start" onClick={onSample}>
        {t("plan.sample")}
      </Button>
    </form>
  );
}

/** "Places in X": tick the sights to see; none ticked means our picks. */
function PlacePicker({
  district,
  places,
  picked,
  onToggle,
}: {
  district: PlannerDistrictInfo | undefined;
  places: PlannerPlaceInfo[];
  picked: number[];
  onToggle: (placeId: number, on: boolean) => void;
}) {
  const t = useT();
  const lang = useNumberLang();
  if (!district || !places.length) return null;
  const count = places.filter((p) => picked.includes(p.id)).length;
  return (
    <details className="group rounded-md border border-border bg-sunken/60">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span>{t("plan.placesIn", { name: district.name })}</span>
        <span className="inline-flex items-center gap-1 font-normal text-muted">
          {count ? t("plan.placesPicked", { count }) : t("plan.ourPicks")}
          <Icon
            name="arrow-right"
            size={16}
            className="transition-transform duration-[var(--dur-1)] group-open:rotate-90"
          />
        </span>
      </summary>
      <div className="flex flex-col gap-0.5 px-3 pb-3">
        <p className="pb-1 text-sm text-muted">{t("plan.placesHint")}</p>
        {places.map((p) => (
          <Checkbox
            key={p.id}
            checked={picked.includes(p.id)}
            onChange={(e) => onToggle(p.id, e.target.checked)}
            label={p.name}
            hint={`${p.kindLabel} · ${formatDuration(p.visitHours, lang)}`}
          />
        ))}
      </div>
    </details>
  );
}

/* Results ------------------------------------------------------------------------------------- */

/**
 * The plan: summary tiles, actions, route map, day cards and costs. `readOnly` (the shared
 * `/trip/:id` page) drops the save button and the sign-in note and takes a fixed `title`.
 */
export function PlanResults({
  plan,
  districts,
  places,
  readOnly = false,
  title: fixedTitle,
}: {
  plan: Plan;
  districts: PlannerDistrictInfo[];
  places: PlannerPlaceInfo[];
  readOnly?: boolean;
  title?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const lang = useNumberLang();
  const toast = useToast();
  const account = useAccount();
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const byId = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const name = (id: number) => byId.get(id)?.name ?? String(id);
  const start = byId.get(plan.input.start)!;
  const stops = [start, ...plan.order.map((id) => byId.get(id)!)];
  const title =
    fixedTitle ||
    [...stops, ...(plan.input.returnToStart ? [start] : [])].map((d) => d.name).join(" → ");
  const { costs } = plan;

  async function onSave() {
    setSaving(true);
    const result = await saveTrip(tripPayload(plan, title));
    setSaving(false);
    if (result.ok) {
      setSavedId(result.id);
      toast.show(t("plan.saved"), { tone: "success" });
    } else if (result.reason === "auth") toast.show(t("plan.signInToSave"));
    else toast.show(t("plan.saveFailed"), { tone: "error" });
  }

  async function onShare() {
    const result = await shareOrCopy({ title, url: window.location.href });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
  }

  return (
    <>
      <section aria-labelledby="plan-summary" className="flex flex-col gap-4">
        <h2 id="plan-summary" className="sr-only print:not-sr-only print:text-h2">
          {title}
        </h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatTile label={t("plan.days")} value={formatNumber(plan.days.length, lang)} />
          <StatTile label={t("plan.totalKm")} value={formatDistance(plan.totalKm, lang)} money />
          <StatTile label={t("plan.total")} value={formatMoney(costs.total, lang)} money />
          <StatTile label={t("plan.perPerson")} value={formatMoney(costs.perPerson, lang)} money />
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {readOnly ? null : (
            <Button icon="bookmark" loading={saving} onClick={onSave}>
              {t("plan.save")}
            </Button>
          )}
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            {t("plan.print")}
          </Button>
          <Button variant="ghost" icon="share" onClick={onShare}>
            {t("common.share")}
          </Button>
        </div>
        {readOnly ? null : savedId !== null ? (
          <p className="text-sm print:hidden" role="status">
            <Link
              href={localePath(locale, `/trip/${savedId}`)}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("plan.openSaved")}
            </Link>
          </p>
        ) : account.status !== "user" ? (
          <p className="text-sm text-muted print:hidden">
            <Link
              href={`${localePath(locale, "/login")}?next=${encodeURIComponent(
                `${localePath(locale, "/plan")}?${planQuery(plan.input)}`,
              )}`}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              {t("plan.signInToSave")}
            </Link>
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] xl:items-start">
        <section
          aria-labelledby="plan-map"
          className={cn("flex flex-col gap-3", "break-inside-avoid")}
        >
          <h2 id="plan-map" className="text-h3">
            {t("plan.mapTitle")}
          </h2>
          <Card as="div" className="p-4">
            <RouteMap
              stops={stops.map((d) => ({ slug: d.slug, name: d.name }))}
              loop={plan.input.returnToStart}
            />
          </Card>
        </section>

        <section aria-labelledby="plan-days" className="flex flex-col gap-3">
          <h2 id="plan-days" className="text-h3">
            {t("plan.itinerary")}
          </h2>
          <ol className="flex flex-col gap-3">
            {plan.days.map((day, i) => (
              <DayCard
                key={day.day}
                day={day}
                last={i === plan.days.length - 1}
                name={name}
                slugOf={(id) => byId.get(id)?.slug ?? ""}
                place={(id) => placeById.get(id)}
                car={plan.vehicles > 0}
                locale={locale}
              />
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="plan-costs" className="flex break-inside-avoid flex-col gap-3">
        <h2 id="plan-costs" className="text-h3">
          {t("plan.costs")}
        </h2>
        <Card as="div" className="overflow-hidden">
          <CostTable
            caption={t("plan.costs")}
            costs={costs}
            rows={[
              { key: "transport", label: t("plan.transport"), amount: costs.transport },
              { key: "stay", label: t("plan.stay"), amount: costs.stay },
              { key: "food", label: t("plan.food"), amount: costs.food },
              { key: "local", label: t("plan.local"), amount: costs.local },
              { key: "misc", label: t("plan.misc"), amount: costs.misc },
            ]}
          />
        </Card>
        <p className="text-sm text-muted">{t("plan.note")}</p>
      </section>
    </>
  );
}

function DayCard({
  day,
  last,
  name,
  slugOf,
  place,
  car,
  locale,
}: {
  day: PlanDay;
  last: boolean;
  name: (id: number) => string;
  slugOf: (id: number) => string;
  place: (id: number) => PlannerPlaceInfo | undefined;
  car: boolean;
  locale: Locale;
}) {
  const t = useT();
  const lang = useNumberLang();

  const row = (item: PlanItem, i: number) => {
    if (item.type === "leg") {
      return (
        <li key={i} data-item="leg" className="flex gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-text">
            <Icon name={car ? "car" : "bus"} size={18} label={t(car ? "plan.car" : "plan.bus")} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold">
              {name(item.from)} → {name(item.to)}
            </span>
            <span className="num text-sm text-muted">
              {t("plan.legMeta", {
                km: formatDistance(item.km, lang),
                hours: formatDuration(item.hours, lang),
                fare: formatMoney(item.farePerPerson, lang),
              })}
            </span>
            <Link
              href={localePath(locale, `/route/${slugOf(item.from)}-to-${slugOf(item.to)}`)}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline print:hidden"
            >
              {t("plan.routeGuide")}
            </Link>
          </div>
        </li>
      );
    }
    const p = place(item.placeId);
    const kind = p && isKind(p.kind) ? p.kind : null;
    return (
      <li key={i} data-item="sight" className="flex gap-3">
        <span
          style={kind ? ({ color: `var(--color-kind-${kind})` } as CSSProperties) : undefined}
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-2"
        >
          <Icon name={kind ? `kinds/${kind}` : "pin"} size={18} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">
            {p ? (
              <Link
                href={localePath(locale, `/place/${p.slug}`)}
                className="underline-offset-4 hover:text-primary hover:underline"
              >
                {p.name}
              </Link>
            ) : null}
            {item.continued ? (
              <StatusTag tone="neutral" className="ml-2 align-middle">
                {t("plan.continued")}
              </StatusTag>
            ) : null}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {kind && p ? <KindBadge kind={kind} label={p.kindLabel} /> : null}
            <span className="num">
              {t("plan.sightMeta", {
                district: name(item.districtId),
                hours: formatDuration(item.hours, lang),
              })}
            </span>
          </span>
        </div>
      </li>
    );
  };

  return (
    <li className="break-inside-avoid">
      <Card as="article" className="gap-3 p-4">
        <h3>
          <span className="num inline-flex h-7 items-center rounded-pill bg-primary px-3 text-sm font-bold text-on-primary">
            {t("plan.day", { n: day.day })}
          </span>
        </h3>
        <ul className="flex flex-col gap-3">{day.items.map(row)}</ul>
        <p className="flex items-center gap-2 border-t border-border pt-3 text-sm font-semibold">
          <Icon name={last ? "flag" : "bed"} size={18} className="text-primary" />
          {last
            ? t("plan.tripEnds", { name: name(day.endsIn) })
            : t("plan.sleepIn", { name: name(day.sleepIn ?? day.endsIn) })}
        </p>
      </Card>
    </li>
  );
}
