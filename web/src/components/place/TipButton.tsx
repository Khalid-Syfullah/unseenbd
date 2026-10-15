"use client";

import { useState } from "react";
import { TipDialog, type TipTarget } from "@/components/community/TipDialog";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/client";

/** "Send a tip or correction" on place and district pages; opens the private tips form. */
export function TipButton({ target, about }: { target: TipTarget; about: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" icon="flag" onClick={() => setOpen(true)} className="w-fit">
        {t("place.tipButton")}
      </Button>
      <TipDialog
        open={open}
        onClose={() => setOpen(false)}
        target={target}
        about={about}
        initialKind="correction"
      />
    </>
  );
}
