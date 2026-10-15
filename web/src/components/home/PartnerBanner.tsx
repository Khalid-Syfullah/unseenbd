"use client";

import { useSyncExternalStore } from "react";
import { PARTNER_BANNER_DISMISS_KEY } from "@/config/site";
import { IconButton } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";

const EVENT = "unseenbd:banner-dismissed";

function readDismissed(url: string): boolean {
  try {
    return window.localStorage.getItem(PARTNER_BANNER_DISMISS_KEY) === url;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * The dismissible partner banner (labelled "Sponsored"). Shown on the server render; a visitor who
 * dismissed it once does not see it again in this browser (remembered per partner URL).
 */
export function PartnerBanner({
  name,
  url,
  text,
  categories,
}: {
  name: string;
  url: string;
  text: string;
  categories: string[];
}) {
  const t = useT();
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(url),
    () => false,
  );

  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(PARTNER_BANNER_DISMISS_KEY, url);
    } catch {
      /* storage blocked: the banner just comes back next visit */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <aside
      aria-label={t("home.banner.label")}
      className="relative flex flex-col gap-3 rounded-lg border border-border bg-accent-wash p-4 pr-14 text-on-accent-wash md:flex-row md:items-center md:gap-5 md:px-5"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag tone="sponsored" className="bg-raised">
            {t("common.sponsored")}
          </StatusTag>
          <span className="font-semibold">{name}</span>
        </div>
        <p>{text}</p>
        {categories.length ? (
          <ul aria-label={t("home.banner.categories")} className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <li
                key={c}
                className="rounded-pill bg-raised px-2.5 py-0.5 text-xs font-semibold text-text"
              >
                {c}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <a
        href={url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="relative inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md bg-raised px-4 font-semibold text-text md:ml-auto"
      >
        {t("home.banner.visit", { name })}
        <Icon name="external" size={18} />
      </a>
      <IconButton
        icon="close"
        label={t("ui.dismiss")}
        onClick={dismiss}
        className="absolute top-2 right-2 text-on-accent-wash hover:bg-raised/60"
      />
    </aside>
  );
}
