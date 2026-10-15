"use client";

import Image from "next/image";
import { CARD } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber, formatPercent } from "@/lib/format";
import { TOTAL_DISTRICTS } from "@/lib/visited/districts";
import { levelIndex, nextLevel, type Level } from "@/lib/visited/levels";

/**
 * DESIGN.md §4.11 progress card: `13 / 64` in the display serif, an 8 px bar, % seen, the level
 * reached (with its badge) and the next goal.
 */
export function ProgressCard({
  count,
  levels,
  label,
  className,
}: {
  count: number;
  levels: Level[];
  /** Visible label above the count (defaults to "Your progress"). */
  label?: string;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const percent = Math.round((count / TOTAL_DISTRICTS) * 100);
  const reached = levelIndex(count, levels);
  const level = reached >= 0 ? levels[reached]! : null;
  const next = nextLevel(count, levels);
  const valueText = `${formatNumber(count, locale)} / ${formatNumber(TOTAL_DISTRICTS, locale)}`;

  return (
    <div className={cn(CARD, "flex-row items-center gap-5 p-5 md:p-6", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-sm font-semibold text-muted">{label ?? t("myBd.progressLabel")}</p>
        <p className="num font-display text-display leading-none text-primary" aria-live="polite">
          {valueText}
        </p>
        <div
          role="progressbar"
          aria-label={t("home.myMap.progress", { seen: count, total: TOTAL_DISTRICTS })}
          aria-valuemin={0}
          aria-valuemax={TOTAL_DISTRICTS}
          aria-valuenow={count}
          aria-valuetext={`${valueText} (${formatPercent(percent, locale)})`}
          className="h-2 w-full overflow-hidden rounded-pill bg-surface-2"
        >
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-[var(--dur-3)] ease-standard"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="num flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold">
            {t("myBd.percentSeen", { percent: formatPercent(percent, locale) })}
          </span>
          <span className="text-muted">
            {level ? t("myBd.level", { level: level.title }) : t("myBd.noLevel")}
          </span>
        </p>
        <p className="num text-sm text-muted">
          {next
            ? `${t("myBd.nextGoal", { count: next.min })} · ${t("myBd.toNext", {
                count: next.min - count,
                level: next.title,
              })}`
            : t("myBd.allDone")}
        </p>
      </div>
      {level ? (
        <Image
          src={level.badge}
          alt={level.title}
          width={96}
          height={104}
          unoptimized
          className="h-auto w-20 shrink-0 md:w-24"
        />
      ) : null}
    </div>
  );
}
