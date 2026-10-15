"use client";

import { ButtonLink } from "@/components/ui/Button";
import { CARD } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { useVisitedIds } from "@/lib/visited";

/**
 * The challenger's count against the visitor's own (read from this browser): "You have seen 9.
 * You have both seen 4. 4 more to catch up." Then the call to action.
 */
export function ChallengeCompare({ theirs }: { theirs: number[] }) {
  const t = useT();
  const locale = useLocale();
  const mine = useVisitedIds();
  const theirSet = new Set(theirs);
  const both = mine.filter((id) => theirSet.has(id)).length;
  const diff = mine.length - theirs.length;

  return (
    <div className={cn(CARD, "gap-3 p-5 md:p-6")} aria-live="polite">
      <p className="text-h3">{t("challenge.question")}</p>
      {mine.length ? (
        <>
          <p className="num">{t("challenge.you", { count: mine.length })}</p>
          <p className="num text-muted">{t("challenge.both", { count: both })}</p>
          <p className="num font-semibold text-primary">
            {diff > 0
              ? t("challenge.ahead")
              : diff < 0
                ? t("challenge.behind", { count: -diff })
                : t("challenge.tie")}
          </p>
        </>
      ) : null}
      <ButtonLink
        href={localePath(locale, "/my-bangladesh")}
        variant="accent"
        icon="trophy"
        className="w-fit"
      >
        {mine.length ? t("challenge.cta") : t("challenge.ctaStart")}
      </ButtonLink>
    </div>
  );
}
