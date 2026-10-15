"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { keepPages, keptCount, offlineSupported, removeKept } from "@/lib/offline";
import { shareOrCopy } from "@/lib/share";
import { setDistrictVisited, useVisited } from "@/lib/visited";

/** Share, "I've been here" (the visited-districts store) and "Keep offline" (service worker cache). */
export function DistrictActions({
  slug,
  title,
  offline,
  className,
}: {
  slug: string;
  title: string;
  /** Pages and pictures to keep for offline use (paths). */
  offline: { pages: string[]; images: string[] };
  className?: string;
}) {
  const t = useT();
  const toast = useToast();
  const been = useVisited().includes(slug);
  const [kept, setKept] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void keptCount(slug).then((n) => live && setKept(n));
    return () => {
      live = false;
    };
  }, [slug]);

  async function toggleOffline() {
    if (!offlineSupported()) {
      toast.show(t("offline.unsupported"), { tone: "error" });
      return;
    }
    setBusy(true);
    try {
      if (kept) {
        await removeKept(slug);
        setKept(0);
      } else {
        const saved = await keepPages(slug, offline.pages, offline.images);
        setKept(saved);
        toast.show(t("offline.done", { count: saved }), { tone: "success" });
      }
    } catch {
      toast.show(t("offline.failed"), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

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
        variant={kept ? "primary" : "secondary"}
        icon="offline"
        aria-pressed={kept > 0}
        loading={busy}
        title={kept ? t("offline.remove") : t("offline.hint")}
        onClick={toggleOffline}
      >
        {busy ? t("offline.keeping") : kept ? t("offline.kept") : t("offline.keep")}
      </Button>
    </div>
  );
}
