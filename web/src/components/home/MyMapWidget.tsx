"use client";

import { BangladeshMap, MAP_DISTRICTS } from "@/components/maps/BangladeshMap";
import { ButtonLink } from "@/components/ui/Button";
import { CARD } from "@/components/ui/Card";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { useVisited } from "@/lib/visited";

const TOTAL = MAP_DISTRICTS.length;
const VALID = new Set(MAP_DISTRICTS.map((d) => d.slug));

/**
 * "My map": the mini Bangladesh map with the districts this visitor has ticked (read from the
 * browser on the client; the server renders the empty state), how many are still unseen and a
 * progress bar.
 */
export function MyMapWidget() {
  const t = useT();
  const locale = useLocale();
  const visited = useVisited().filter((slug) => VALID.has(slug));
  const seen = visited.length;
  const percent = Math.round((seen / TOTAL) * 100);

  return (
    <div className={`${CARD} items-center gap-5 p-5 md:flex-row md:gap-8 md:p-6`}>
      <div className="w-full max-w-[240px] shrink-0">
        <BangladeshMap visited={visited} size="mini" label={t("map.bangladesh")} />
      </div>
      <div className="flex w-full min-w-0 flex-col gap-3">
        <p className="num font-display text-display text-primary" aria-live="polite">
          {t("home.myMap.unseen", { count: TOTAL - seen })}
        </p>
        <div
          role="progressbar"
          aria-label={t("home.myMap.progress", { seen, total: TOTAL })}
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-valuenow={seen}
          className="h-2 w-full overflow-hidden rounded-pill bg-surface-2"
        >
          <div className="h-full rounded-pill bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="num text-sm text-muted">{t("home.myMap.progress", { seen, total: TOTAL })}</p>
        {seen === 0 ? <p className="text-muted">{t("home.myMap.hint")}</p> : null}
        <ButtonLink
          href={localePath(locale, "/my-bangladesh")}
          trailingIcon="arrow-right"
          className="w-fit"
        >
          {t("home.myMap.cta")}
        </ButtonLink>
      </div>
    </div>
  );
}
