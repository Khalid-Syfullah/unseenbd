"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Card, StatTile } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { Field, Select, Stepper, Switch, type SelectGroup } from "@/components/ui/Form";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { formatDistance, formatDuration, formatMoney } from "@/lib/format";
import { tripCost } from "@/lib/planner/calculator";
import { MAX_NIGHTS, MAX_PEOPLE, MIN_PEOPLE } from "@/lib/planner/constants";
import { tripCostQuery, type TripCostState } from "@/lib/planner/url";
import type { PlannerDistrictInfo, PlannerDivision } from "@/server/data/planner";
import { CostTable, LevelControl, useNumberLang } from "./shared";

/** The A → B trip cost calculator (MASTER_PROMPT §5.5, FEATURES.md §4.2). */
export function TripCost({
  divisions,
  districts,
  initial,
}: {
  divisions: PlannerDivision[];
  districts: PlannerDistrictInfo[];
  initial: TripCostState;
}) {
  const t = useT();
  const locale = useLocale();
  const lang = useNumberLang();
  const id = useId();
  const [state, setState] = useState<TripCostState>(initial);
  const byId = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const from = byId.get(state.from);
  const to = state.to !== null ? byId.get(state.to) : undefined;
  const result = useMemo(
    () =>
      from && to && from.id !== to.id
        ? tripCost({
            from,
            to,
            people: state.people,
            nights: state.nights,
            level: state.level,
            roundTrip: state.roundTrip,
          })
        : null,
    [from, to, state.people, state.nights, state.level, state.roundTrip],
  );

  // Keep the inputs in the URL so the result can be shared.
  const query = tripCostQuery(state);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${query}`);
  }, [query]);

  const update = (patch: Partial<TripCostState>) => setState((s) => ({ ...s, ...patch }));
  const groups = (disable: (id: number) => boolean): SelectGroup[] =>
    divisions.map((dv) => ({
      label: dv.name,
      options: dv.districts.map((d) => ({
        value: String(d.id),
        label: d.name,
        disabled: disable(d.id),
      })),
    }));

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <form
        aria-label={t("tripCost.formTitle")}
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-5 rounded-lg border border-border bg-raised p-4 shadow-1 md:p-5 lg:sticky lg:top-[calc(var(--header-h)+16px)]"
      >
        <h2 className="text-h3">{t("tripCost.formTitle")}</h2>
        <Field label={t("tripCost.from")} htmlFor={`${id}-from`}>
          <Select
            id={`${id}-from`}
            value={String(state.from)}
            groups={groups(() => false)}
            onChange={(e) => {
              const next = Number(e.target.value);
              update({ from: next, to: state.to === next ? null : state.to });
            }}
          />
        </Field>
        <Field label={t("tripCost.to")} htmlFor={`${id}-to`}>
          <Select
            id={`${id}-to`}
            value={state.to === null ? "" : String(state.to)}
            placeholder={t("tripCost.choose")}
            groups={groups((d) => d === state.from)}
            onChange={(e) => update({ to: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold" aria-hidden>
              {t("plan.travellers")}
            </span>
            <Stepper
              label={t("plan.travellers")}
              value={state.people}
              min={MIN_PEOPLE}
              max={MAX_PEOPLE}
              onChange={(people) => update({ people })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold" aria-hidden>
              {t("tripCost.nights")}
            </span>
            <Stepper
              label={t("tripCost.nights")}
              value={state.nights}
              min={0}
              max={MAX_NIGHTS}
              onChange={(nights) => update({ nights })}
            />
          </div>
        </div>
        <LevelControl value={state.level} onChange={(level) => update({ level })} />
        <Switch
          checked={state.roundTrip}
          onChange={(roundTrip) => update({ roundTrip })}
          label={t("tripCost.roundTrip")}
        />
      </form>

      <div className="flex min-w-0 flex-col gap-6">
        {result && from && to ? (
          <>
            <section aria-labelledby="cost-result" className="flex flex-col gap-4">
              <h2 id="cost-result" className="text-h2">
                {t("tripCost.results")}
              </h2>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                <StatTile
                  label={t("plan.total")}
                  value={formatMoney(result.costs.total, lang)}
                  money
                  className="col-span-2 xl:col-span-1"
                />
                <StatTile
                  label={t("plan.perPerson")}
                  value={formatMoney(result.costs.perPerson, lang)}
                  money
                />
                <StatTile
                  label={t("tripCost.roadKm")}
                  value={formatDistance(result.km, lang)}
                  sub={t("tripCost.roadTime", { hours: formatDuration(result.hours, lang) })}
                  money
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <ButtonLink
                  href={`${localePath(locale, "/plan")}?from=${from.id}&add=${to.id}`}
                  icon="planner"
                >
                  {t("tripCost.addToPlan")}
                </ButtonLink>
                <TextLink
                  href={localePath(locale, `/route/${from.slug}-to-${to.slug}`)}
                  trailingIcon="arrow-right"
                >
                  {t("plan.routeGuide")}
                </TextLink>
              </div>
            </section>

            <section aria-labelledby="cost-breakdown" className="flex flex-col gap-3">
              <h2 id="cost-breakdown" className="text-h3">
                {t("tripCost.breakdown")}
              </h2>
              <Card as="div" className="overflow-hidden">
                <CostTable
                  caption={t("tripCost.breakdown")}
                  costs={result.costs}
                  rows={[
                    {
                      key: "transport",
                      label: t("plan.transport"),
                      amount: result.costs.transport,
                    },
                    { key: "stay", label: t("plan.stay"), amount: result.costs.stay },
                    { key: "food", label: t("plan.food"), amount: result.costs.food },
                    { key: "local", label: t("plan.local"), amount: result.costs.local },
                    { key: "misc", label: t("tripCost.buffer"), amount: result.costs.misc },
                  ]}
                />
              </Card>
              <p className="num text-sm text-muted">
                {t("tripCost.fareEach", { fare: formatMoney(result.farePerPerson, lang) })}
              </p>
              <p className="text-sm text-muted">{t("tripCost.note")}</p>
            </section>
          </>
        ) : (
          <EmptyState illustration="planner" body={t("tripCost.empty")} />
        )}
      </div>
    </div>
  );
}
