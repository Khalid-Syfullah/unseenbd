import Link from "next/link";
import { PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { Level } from "@/lib/visited/levels";
import { ProgressCard } from "./ProgressCard";
import type { MyDivision } from "./types";

/**
 * The read-only view of a shared My Bangladesh link (`?v=…&n=…`): "Rahim has seen 13 districts",
 * their progress and map, the districts by division, and "Make your own".
 */
export function SharedBangladesh({
  locale,
  ids,
  name,
  divisions,
  levels,
}: {
  locale: Locale;
  ids: number[];
  name: string;
  divisions: MyDivision[];
  levels: Level[];
}) {
  const t = getT(locale);
  const visited = new Set(ids);
  const slugs = divisions.flatMap((d) =>
    d.districts.filter((x) => visited.has(x.id)).map((x) => x.slug),
  );
  const title = name ? t("myBd.sharedTitle", { name }) : t("myBd.sharedTitleAnon");
  const line = name
    ? t("myBd.sharedLine", { name, count: ids.length })
    : t("myBd.sharedLineAnon", { count: ids.length });
  const makeOwn = (
    <ButtonLink href={localePath(locale, "/my-bangladesh")} variant="accent" icon="my-map">
      {t("myBd.makeOwn")}
    </ButtonLink>
  );

  if (!ids.length) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={title} />
        <EmptyState body={t("myBd.sharedEmpty")} action={makeOwn} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} intro={line} />
      <div className="flex flex-wrap gap-2">{makeOwn}</div>
      <ProgressCard count={ids.length} levels={levels} label={line} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,640px)_1fr]">
        <div className="flex flex-col gap-2">
          <BangladeshMap
            visited={slugs}
            labels
            legend
            label={t("myBd.sharedMap", { name: name || t("challenge.friend") })}
          />
          <p className="text-xs text-subtle">{t("map.credit")}</p>
        </div>
        <PageSection id="shared-districts" title={t("challenge.theirDistricts")}>
          <div className="flex flex-col gap-4">
            {divisions.map((division) => {
              const seen = division.districts.filter((d) => visited.has(d.id));
              if (!seen.length) return null;
              return (
                <div key={division.slug} className="flex flex-col gap-1">
                  <h3 className="text-h3">{division.name}</h3>
                  <ul className="flex flex-wrap gap-x-4">
                    {seen.map((d) => (
                      <li key={d.id}>
                        <Link
                          href={localePath(locale, `/district/${d.slug}`)}
                          className="inline-flex min-h-11 items-center underline decoration-primary decoration-2 underline-offset-[6px] hover:text-primary"
                        >
                          {d.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </PageSection>
      </div>
    </div>
  );
}
