"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";
import { PageSection } from "@/components/discovery/PageHeader";
import { Button } from "@/components/ui/Button";
import { FeatureCard } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Field, Select } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import type { MessageKey } from "@/i18n/translate";
import {
  levelIndex,
  setDistrictsVisited,
  setStoryDistrict,
  STORY_FIELDS,
  TOTAL_DISTRICTS,
  useStory,
  type Level,
  type StoryField,
} from "@/lib/visited";
import type { MyDivision } from "./types";

/** DESIGN.md §4.11 level ladder: five rows with badge, title, threshold; reached rows get ✓. */
export function LevelLadder({ count, levels }: { count: number; levels: Level[] }) {
  const t = useT();
  const reached = levelIndex(count, levels);
  return (
    <PageSection id="levels" title={t("myBd.levelsTitle")}>
      <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-raised">
        {levels.map((level, i) => {
          const done = i <= reached;
          return (
            <li
              key={level.min}
              className={cn("flex items-center gap-4 px-4 py-3", done && "bg-primary-wash/40")}
            >
              <Image
                src={level.badge}
                alt=""
                width={48}
                height={52}
                unoptimized
                className={cn("h-auto w-12 shrink-0", !done && "opacity-40 grayscale")}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{level.title}</span>
                <span className="num text-sm text-muted">
                  {t("common.districtCount", { count: level.min })}
                </span>
              </div>
              {done ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-success-text">
                  <Icon name="check" size={18} />
                  {t("myBd.levelReached")}
                </span>
              ) : (
                <span className="num text-sm text-muted">
                  {t("myBd.levelToGo", { count: level.min - count })}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </PageSection>
  );
}

/**
 * DESIGN.md §4.11 passport: a stamp per district (`assets/stamps/{slug}.svg`, 96 px); stamps for
 * districts not yet visited are shown at 15 %.
 */
export function PassportStamps({
  divisions,
  visited,
}: {
  divisions: MyDivision[];
  visited: ReadonlySet<number>;
}) {
  const t = useT();
  const all = divisions.flatMap((d) => d.districts);
  return (
    <PageSection
      id="passport"
      title={t("myBd.passportTitle")}
      aside={
        <span className="num text-sm font-semibold text-muted">
          {t("myBd.passportCount", { count: visited.size, total: TOTAL_DISTRICTS })}
        </span>
      }
    >
      <p className="text-sm text-muted">{t("myBd.passportNote")}</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3">
        {all.map((d) => {
          const done = visited.has(d.id);
          return (
            <li key={d.id} className="flex justify-center" data-stamped={done ? "" : undefined}>
              <Image
                src={`/stamps/${d.slug}.svg`}
                alt={t(done ? "myBd.stampDone" : "myBd.stampLocked", { name: d.name })}
                title={d.name}
                width={96}
                height={96}
                unoptimized
                loading="lazy"
                className={cn(
                  "size-24 transition-opacity duration-[var(--dur-2)] ease-standard",
                  done ? "opacity-100" : "opacity-15",
                )}
              />
            </li>
          );
        })}
      </ul>
    </PageSection>
  );
}

const STORY_LABELS: Record<StoryField, MessageKey> = {
  birth: "myBd.storyBirth",
  upbringing: "myBd.storyUpbringing",
  study: "myBd.storyStudy",
  work: "myBd.storyWork",
  favourite: "myBd.storyFavourite",
};

/** "My Bangladesh story": five district selects, kept in this browser. */
export function StorySection({ divisions }: { divisions: MyDivision[] }) {
  const t = useT();
  const uid = useId();
  const story = useStory();
  const groups = divisions.map((d) => ({
    label: d.name,
    options: d.districts.map((x) => ({ value: String(x.id), label: x.name })),
  }));
  const chosen = STORY_FIELDS.map((f) => story[f]).filter((id): id is number => id !== undefined);

  return (
    <PageSection id="story" title={t("myBd.storyTitle")}>
      <p className="text-muted">{t("myBd.storyIntro")}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STORY_FIELDS.map((field) => {
          const id = `${uid}-${field}`;
          return (
            <Field key={field} label={t(STORY_LABELS[field])} htmlFor={id}>
              <Select
                id={id}
                value={story[field] !== undefined ? String(story[field]) : ""}
                placeholder={t("myBd.storyChoose")}
                groups={groups}
                onChange={(e) =>
                  setStoryDistrict(field, e.target.value ? Number(e.target.value) : null)
                }
              />
            </Field>
          );
        })}
      </div>
      {chosen.length ? (
        <Button
          variant="secondary"
          icon="my-map"
          className="w-fit"
          onClick={() => setDistrictsVisited(chosen, true)}
        >
          {t("myBd.storyAdd")}
        </Button>
      ) : null}
    </PageSection>
  );
}

/** "More to try": the district quiz, bucket list, My World and the planner. */
export function MoreToTry() {
  const t = useT();
  const locale = useLocale();
  const items = [
    { icon: "quiz", title: "myBd.moreQuiz", body: "myBd.moreQuizBody", path: "/quiz/bangladesh" },
    {
      icon: "bookmark",
      title: "myBd.moreBucket",
      body: "myBd.moreBucketBody",
      path: "/bucket-list",
    },
    { icon: "world", title: "myBd.moreWorld", body: "myBd.moreWorldBody", path: "/world" },
    { icon: "planner", title: "myBd.morePlan", body: "myBd.morePlanBody", path: "/plan" },
  ] as const;
  return (
    <PageSection id="more" title={t("myBd.moreTitle")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <FeatureCard
            key={item.path}
            icon={item.icon}
            title={t(item.title)}
            body={t(item.body)}
            href={localePath(locale, item.path)}
          />
        ))}
      </div>
    </PageSection>
  );
}

/**
 * The share-card maker's section (`#card-maker` on My Bangladesh, `#image-maker` on My World).
 * The maker itself (`components/card`) is passed as children.
 */
export function CardMakerSlot({
  id = "card-maker",
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-slot="card-maker"
      className="flex scroll-mt-24 flex-col gap-3"
    >
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}
