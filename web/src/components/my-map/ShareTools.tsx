"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { CARD } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Field, TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { copyText, shareOrCopy } from "@/lib/share";
import { MAX_NAME_LENGTH, setShareName, useShareName } from "@/lib/visited";

/** `https://wa.me/?text=…`: WhatsApp's share link (app on phones, web elsewhere). */
export function whatsappUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

/** Facebook's share dialog for a URL. */
export function facebookUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** The page origin plus a path (client only). */
export function absolute(path: string): string {
  return new URL(path, window.location.origin).toString();
}

function openWindow(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** The optional display name, remembered in this browser. */
export function ShareNameField() {
  const t = useT();
  const id = useId();
  const name = useShareName();
  return (
    <Field label={t("myBd.nameLabel")} htmlFor={id} className="max-w-[360px]">
      <TextInput
        id={id}
        value={name}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="nickname"
        placeholder={t("myBd.namePlaceholder")}
        onChange={(e) => setShareName(e.target.value)}
      />
    </Field>
  );
}

/**
 * Share / WhatsApp / Facebook / Copy link (and any extra buttons). `link()` builds the path to
 * share at click time, so it always carries the latest state and name.
 */
export function ShareButtons({
  title,
  text,
  link,
  disabled,
  children,
}: {
  title: string;
  text: string;
  link: () => string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  const toast = useToast();

  async function share() {
    const result = await shareOrCopy({ title, url: absolute(link()) });
    if (result === "copied") toast.show(t("common.linkCopied"), { tone: "success" });
    else if (result === "failed") toast.show(t("common.somethingWrong"), { tone: "error" });
  }

  async function copy() {
    const ok = await copyText(absolute(link()));
    toast.show(ok ? t("common.linkCopied") : t("common.somethingWrong"), {
      tone: ok ? "success" : "error",
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button icon="share" onClick={share} disabled={disabled}>
        {t("common.share")}
      </Button>
      <Button
        variant="secondary"
        icon="whatsapp"
        disabled={disabled}
        onClick={() => openWindow(whatsappUrl(text, absolute(link())))}
      >
        {t("myBd.whatsapp")}
      </Button>
      <Button
        variant="secondary"
        icon="facebook"
        disabled={disabled}
        onClick={() => openWindow(facebookUrl(absolute(link())))}
      >
        {t("myBd.facebook")}
      </Button>
      <Button variant="secondary" icon="copy" onClick={copy} disabled={disabled}>
        {t("common.copyLink")}
      </Button>
      {children}
    </div>
  );
}

/** A titled card that holds share controls (DESIGN.md §4.11 share panel). */
export function SharePanelCard({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(CARD, "scroll-mt-24 gap-4 p-5 md:p-6", className)}
    >
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}
