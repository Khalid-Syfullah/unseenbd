"use client";

import { SegmentedControl } from "@/components/ui/Form";
import { cn } from "@/components/ui/cn";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatMoney } from "@/lib/format";
import { BUDGET_LEVELS, type BudgetLevel } from "@/lib/planner/constants";
import type { PlanCosts } from "@/lib/planner/types";

/** The content language for numbers (`bn` gets Bengali numerals, everything else Western). */
export function useNumberLang(): "bn" | "en" {
  return contentLocale(useLocale());
}

/** Budget level: Thrifty | Moderate | Plush, with a helper line for the selected one. */
export function LevelControl({
  value,
  onChange,
}: {
  value: BudgetLevel;
  onChange: (level: BudgetLevel) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold" aria-hidden>
        {t("plan.budget")}
      </span>
      <SegmentedControl
        label={t("plan.budget")}
        value={value}
        onChange={onChange}
        options={BUDGET_LEVELS.map((level) => ({
          value: level,
          label: t(`plan.levels.${level}`),
          hint: t(`plan.levelHints.${level}`),
        }))}
      />
    </div>
  );
}

export type CostRow = { key: string; label: string; amount: number };

/**
 * Cost table (DESIGN.md §4.9): category · ৳, zebra rows, a bold total row with a top border and a
 * per-person row.
 */
export function CostTable({
  caption,
  rows,
  costs,
  className,
}: {
  caption: string;
  rows: CostRow[];
  costs: Pick<PlanCosts, "total" | "perPerson">;
  className?: string;
}) {
  const t = useT();
  const lang = useNumberLang();
  return (
    <table className={cn("w-full border-collapse text-base", className)}>
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t("plan.category")}</th>
          <th scope="col">{t("plan.amount")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} data-cost={r.key} className="even:bg-sunken">
            <th scope="row" className="px-4 py-2.5 text-left font-normal">
              {r.label}
            </th>
            <td className="num px-4 py-2.5 text-right">{formatMoney(r.amount, lang)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr data-cost="total" className="border-t-2 border-text/70">
          <th scope="row" className="px-4 pt-3 pb-1.5 text-left text-lg font-bold">
            {t("plan.total")}
          </th>
          <td className="num px-4 pt-3 pb-1.5 text-right text-lg font-bold">
            {formatMoney(costs.total, lang)}
          </td>
        </tr>
        <tr data-cost="per-person">
          <th scope="row" className="px-4 pb-3 text-left font-normal text-muted">
            {t("plan.perPerson")}
          </th>
          <td className="num px-4 pb-3 text-right text-muted">
            {formatMoney(costs.perPerson, lang)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
