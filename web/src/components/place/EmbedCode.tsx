"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { copyText } from "@/lib/share";

/** A read-only code box with a Copy button. */
export function EmbedCode({ code }: { code: string }) {
  const t = useT();
  const toast = useToast();
  const id = useId();

  async function copy() {
    const ok = await copyText(code);
    toast.show(ok ? t("place.embedCopied") : t("place.copyFailed"), {
      tone: ok ? "success" : "error",
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {t("place.embedCode")}
      </label>
      <textarea
        id={id}
        readOnly
        rows={4}
        value={code}
        spellCheck={false}
        dir="ltr"
        lang="en"
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-y rounded-md border border-border-strong bg-surface-2 p-3 font-mono text-sm text-text"
      />
      <Button variant="secondary" icon="copy" onClick={copy} className="w-fit">
        {t("place.embedCopy")}
      </Button>
    </div>
  );
}
