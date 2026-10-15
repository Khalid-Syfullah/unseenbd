"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { DistrictSelect, type DivisionGroup } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";

/**
 * Gallery filters and layout (DESIGN.md §5.8): a search over area / place / district with a
 * district select (a plain GET form, so it works without JavaScript), and the district map as a
 * filter: a sticky 300 px column on desktop, behind a "Map" toggle on phones.
 */
export function GalleryShell({
  divisions,
  district,
  q,
  children,
}: {
  divisions: DivisionGroup[];
  district: string;
  q: string;
  children: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const base = localePath(locale, "/gallery");
  const [mapOpen, setMapOpen] = useState(false);
  const qId = useId();
  const dId = useId();
  const mapId = useId();

  const go = (params: { district?: string; q?: string }) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.district) query.set("district", params.district);
    const text = query.toString();
    router.push(text ? `${base}?${text}` : base);
  };

  return (
    <div className="flex flex-col gap-5">
      <form action={base} method="get" role="search" className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <label htmlFor={qId} className="sr-only">
            {t("gallery.search")}
          </label>
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            id={qId}
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("gallery.searchPlaceholder")}
            maxLength={100}
            className="h-12 w-full rounded-sm border border-subtle bg-sunken pr-3 pl-10 text-base text-text placeholder:text-muted focus-visible:border-focus"
          />
        </div>
        <div className="md:w-64">
          <label htmlFor={dId} className="sr-only">
            {t("gallery.district")}
          </label>
          <DistrictSelect
            id={dId}
            name="district"
            divisions={divisions}
            placeholder={t("gallery.allDistricts")}
            defaultValue={district}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" icon="search" className="h-12 flex-1 md:flex-none">
            {t("gallery.apply")}
          </Button>
          <Button
            variant="secondary"
            icon="my-map"
            className="h-12 lg:hidden"
            aria-expanded={mapOpen}
            aria-controls={mapId}
            onClick={() => setMapOpen((v) => !v)}
          >
            {mapOpen ? t("gallery.hideMap") : t("gallery.map")}
          </Button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <aside
          id={mapId}
          aria-label={t("gallery.mapLabel")}
          className={cn("lg:sticky lg:top-24 lg:block", mapOpen ? "block" : "hidden")}
        >
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-raised p-4">
            <p className="text-sm text-muted">{t("gallery.mapHint")}</p>
            <BangladeshMap
              size="mini"
              selected={district || null}
              label={t("gallery.mapLabel")}
              onSelect={(slug) => go({ q, district: slug === district ? "" : slug })}
              className="mx-auto"
            />
            {district || q ? (
              <ButtonLink href={base} variant="ghost" size="sm" icon="close" className="self-start">
                {t("gallery.clear")}
              </ButtonLink>
            ) : null}
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
