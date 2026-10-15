"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { shareOrCopy } from "@/lib/share";
import { setDistrictVisited, useVisited } from "@/lib/visited";

/** Share, "I've been here" (the visited-districts store) and "Keep offline" (a no-op for now). */
export function DistrictActions({
  slug,
  title,
  className,
}: {
  slug: string;
  title: string;
  className?: string;
}) {
  const t = useT();
  const toast = useToast();
  const been = useVisited().includes(slug);

  async function share() {
    const result = await shareOrCopy({ title, url: window.location.href });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button variant="secondary" icon="share" onClick={share}>
        {t("common.share")}
      </Button>
      <Button
        variant={been ? "primary" : "secondary"}
        icon="check"
        aria-pressed={been}
        onClick={() => setDistrictVisited(slug, !been)}
      >
        {been ? t("district.beenHereOn") : t("district.beenHere")}
      </Button>
      <Button
        variant="secondary"
        icon="offline"
        onClick={() => toast.show(t("district.offlineSoon"))}
      >
        {t("district.offline")}
      </Button>
    </div>
  );
}
