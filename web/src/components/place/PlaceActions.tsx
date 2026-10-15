"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber } from "@/lib/format";
import { contentLocale } from "@/i18n/locales";
import { setBucketStatus, useBucket } from "@/lib/bucket";
import { shareOrCopy } from "@/lib/share";

/**
 * The four actions on a place page: Want to go (the bucket-list store), Share (Web Share API,
 * copying the link where it is missing), Add to trending (shown disabled until voting opens) and
 * Write an experience or warning (the tips form arrives with the community features).
 */
export function PlaceActions({
  slug,
  name,
  trendCount,
  className,
}: {
  slug: string;
  name: string;
  trendCount: number;
  className?: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const toast = useToast();
  const bucket = useBucket();
  const noteId = useId();
  const wanted = bucket[slug] === "want";

  async function share() {
    const result = await shareOrCopy({ title: name, url: window.location.href });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        variant={wanted ? "primary" : "secondary"}
        icon="heart"
        aria-pressed={wanted}
        onClick={() => setBucketStatus(slug, "want")}
      >
        {wanted ? t("place.onYourList") : t("place.wantToGo")}
      </Button>
      <Button variant="secondary" icon="share" onClick={share}>
        {t("common.share")}
      </Button>
      <Button variant="secondary" icon="upvote" disabled aria-describedby={noteId}>
        {t("place.trendAdd", { count: formatNumber(trendCount, lang) })}
      </Button>
      <span id={noteId} className="sr-only">
        {t("place.trendSoon")}
      </span>
      <Button variant="secondary" icon="comment" onClick={() => toast.show(t("place.tipSoon"))}>
        {t("place.writeTip")}
      </Button>
    </div>
  );
}
