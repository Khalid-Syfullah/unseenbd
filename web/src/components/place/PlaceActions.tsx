"use client";

import { useState } from "react";
import { TipDialog } from "@/components/community/TipDialog";
import { TrendButton } from "@/components/community/TrendButton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { setBucketStatus, useBucket } from "@/lib/bucket";
import { shareOrCopy } from "@/lib/share";

/**
 * The four actions on a place page: Want to go (the bucket-list store), Share (Web Share API,
 * copying the link where it is missing), Add to trending (one vote per visitor per season) and
 * Write an experience or warning (a private note to the editors).
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
  const toast = useToast();
  const bucket = useBucket();
  const [tipOpen, setTipOpen] = useState(false);
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
      <TrendButton slug={slug} name={name} initialVotes={trendCount} />
      <Button variant="secondary" icon="comment" onClick={() => setTipOpen(true)}>
        {t("place.writeTip")}
      </Button>
      <TipDialog
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        target={{ place: slug }}
        about={name}
        initialKind="experience"
      />
    </div>
  );
}
