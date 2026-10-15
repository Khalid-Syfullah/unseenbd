"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageSection } from "@/components/discovery/PageHeader";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { LinkButton } from "@/components/ui/Button";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { replaceVisited, setDistrictVisited, useVisitedIds, type Level } from "@/lib/visited";
import { DistrictPicker } from "./DistrictPicker";
import { CardMakerSlot, LevelLadder, MoreToTry, PassportStamps, StorySection } from "./Extras";
import { ProgressCard } from "./ProgressCard";
import { SharePanel } from "./SharePanel";
import type { MyDivision } from "./types";

/**
 * The /my-bangladesh page body (FEATURES.md §5.1–5.6, DESIGN.md §5.6): progress, the district
 * picker, the map, the visited list, sharing, the card maker slot, levels, passport stamps, the
 * story and more to try. Everything reads and writes the browser store in `lib/visited`, so the
 * page, the home widget and other tabs stay in step.
 */
export function MyBangladesh({ divisions, levels }: { divisions: MyDivision[]; levels: Level[] }) {
  const t = useT();
  const locale = useLocale();
  const ids = useVisitedIds();
  const visited = useMemo(() => new Set(ids), [ids]);
  const all = useMemo(() => divisions.flatMap((d) => d.districts), [divisions]);
  const byId = useMemo(() => new Map(all.map((d) => [d.id, d])), [all]);
  const visitedSlugs = useMemo(
    () => ids.map((id) => byId.get(id)?.slug).filter((s): s is string => Boolean(s)),
    [ids, byId],
  );
  const count = ids.length;

  function clearAll() {
    if (window.confirm(t("myBd.clearConfirm", { count }))) replaceVisited([]);
  }

  return (
    <div className="flex flex-col gap-10">
      <ProgressCard count={count} levels={levels} />

      <DistrictPicker divisions={divisions} visited={visited} />

      <PageSection id="map" title={t("myBd.mapTitle")}>
        <p className="text-sm text-muted">{t("myBd.mapHint")}</p>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,640px)_1fr]">
          <div className="flex flex-col gap-2">
            <BangladeshMap
              visited={visitedSlugs}
              onToggle={(slug, on) => setDistrictVisited(slug, on)}
              labelToggle
              legend
              label={t("myBd.mapTitle")}
            />
            <p className="text-xs text-subtle">{t("map.credit")}</p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-h3">{t("myBd.visitedTitle")}</h3>
            {count ? (
              <>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {ids.map((id) => {
                    const d = byId.get(id);
                    if (!d) return null;
                    return (
                      <li key={id}>
                        <Link
                          href={localePath(locale, `/district/${d.slug}`)}
                          className="inline-flex min-h-11 items-center font-semibold underline decoration-primary decoration-2 underline-offset-[6px] hover:text-primary"
                        >
                          {d.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <LinkButton icon="close" className="w-fit text-danger" onClick={clearAll}>
                  {t("myBd.clearAll")}
                </LinkButton>
              </>
            ) : (
              <p className="text-muted">{t("myBd.visitedEmpty")}</p>
            )}
          </div>
        </div>
      </PageSection>

      <SharePanel ids={ids} />

      <CardMakerSlot title={t("myBd.cardTitle")} body={t("myBd.cardSoon")} />

      <LevelLadder count={count} levels={levels} />

      <PassportStamps divisions={divisions} visited={visited} />

      <StorySection divisions={divisions} />

      <MoreToTry />
    </div>
  );
}
