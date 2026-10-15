"use client";

import { PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { WorldMap } from "@/components/maps/WorldMap";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale, localePath } from "@/i18n/locales";
import type { WorldMark } from "@/lib/visited";
import { CONTINENT_LABEL, CONTINENTS, COUNTRIES, COUNTRY_KEYS } from "./world-data";

/** The read-only view of a shared world link (`/world?v=…&w=…&n=…`), with "Make your own". */
export function SharedWorld({
  visited,
  wish,
  name,
}: {
  visited: string[];
  wish: string[];
  name: string;
}) {
  const t = useT();
  const locale = useLocale();
  const bn = contentLocale(locale) === "bn";
  const seen = visited.filter((k) => COUNTRY_KEYS.has(k));
  const wanted = wish.filter((k) => COUNTRY_KEYS.has(k));
  const value: Record<string, WorldMark> = {};
  for (const k of wanted) value[k] = "wish";
  for (const k of seen) value[k] = "visited";

  const title = name ? t("world.sharedTitle", { name }) : t("world.sharedTitleAnon");
  const line = name
    ? t("world.sharedLine", { name, count: seen.length })
    : t("world.sharedLineAnon", { count: seen.length });
  const makeOwn = (
    <ButtonLink href={localePath(locale, "/world")} variant="accent" icon="world">
      {t("world.makeOwn")}
    </ButtonLink>
  );

  if (!seen.length && !wanted.length) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={title} />
        <EmptyState body={t("world.sharedEmpty")} action={makeOwn} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={title}
        intro={
          <>
            {line}
            {wanted.length ? ` · ${t("world.wishCount", { count: wanted.length })}` : null}
          </>
        }
      />
      <div>{makeOwn}</div>
      <WorldMap value={value} legend label={title} />
      <p className="text-xs text-subtle">{t("map.worldCredit")}</p>
      {CONTINENTS.map((key) => {
        const list = COUNTRIES.filter((c) => c.continentKey === key && value[c.key]);
        if (!list.length) return null;
        return (
          <PageSection key={key} id={`shared-${key}`} title={t(CONTINENT_LABEL[key])}>
            <ul className="flex flex-wrap gap-2">
              {list.map((c) => (
                <li
                  key={c.key}
                  className="inline-flex h-9 items-center gap-2 rounded-pill bg-surface-2 px-3.5 text-sm font-semibold"
                >
                  <span
                    aria-hidden
                    className={
                      value[c.key] === "visited"
                        ? "size-3 rounded-xs bg-map-visited"
                        : "size-3 rounded-xs bg-map-wish"
                    }
                  />
                  {bn ? c.nameBn : c.nameEn}
                  <span className="sr-only">
                    ({value[c.key] === "visited" ? t("map.visited") : t("map.wish")})
                  </span>
                </li>
              ))}
            </ul>
          </PageSection>
        );
      })}
    </div>
  );
}
