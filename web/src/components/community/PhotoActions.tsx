"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { shareOrCopy } from "@/lib/share";
import { LikeButton, useReactions } from "./Reactions";
import { ReportButton } from "./ReportButton";

/** Like, share and report on a photo page. */
export function PhotoActions({ id, likes, title }: { id: number; likes: number; title: string }) {
  const t = useT();
  const toast = useToast();
  const { totals, mine, toggle } = useReactions("photo", id, { likes });

  async function share() {
    const result = await shareOrCopy({ title, url: window.location.href });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LikeButton count={totals.likes} on={mine.like} onToggle={() => void toggle("like")} />
      <Button variant="secondary" size="sm" icon="share" onClick={share} className="h-11">
        {t("common.share")}
      </Button>
      <ReportButton type="photo" id={id} />
    </div>
  );
}
