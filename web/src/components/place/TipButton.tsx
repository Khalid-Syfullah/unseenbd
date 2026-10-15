"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";

/** "Send a tip" opens the tips form once the community features exist; until then it says so. */
export function TipButton() {
  const t = useT();
  const toast = useToast();
  return (
    <Button
      variant="secondary"
      icon="flag"
      onClick={() => toast.show(t("place.tipSoon"))}
      className="w-fit"
    >
      {t("place.tipButton")}
    </Button>
  );
}
