"use client";

import { useMemo, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { DistrictSelect, Field, type DivisionGroup } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { PlaceRow } from "@/components/ui/PlaceCard";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { formatDistance, formatNumber } from "@/lib/format";
import { directionsUrl, haversineKm } from "@/lib/geo";

export type NearPlace = {
  slug: string;
  name: string;
  districtName: string;
  kindKey: string;
  kindLabel: string;
  lat: number;
  lng: number;
  /** 640 px cover image, or null. */
  cover: string | null;
};

export type NearDistrict = { slug: string; name: string; lat: number; lng: number };
export type NearKind = { key: string; label: string };

type Origin = { type: "district"; slug: string } | { type: "geo"; lat: number; lng: number };
type GeoState = "idle" | "locating" | "denied" | "unavailable" | "unsupported";

const PAGE = 24;

/** The places nearest to a point, sorted by haversine distance (the straight line, in km). */
export function nearest<T extends { lat: number; lng: number }>(
  places: readonly T[],
  lat: number,
  lng: number,
): (T & { distanceKm: number })[] {
  return places
    .map((p) => ({ ...p, distanceKm: haversineKm(lat, lng, p.lat, p.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * "Near me": the places nearest to a start district or, once the visitor presses "Use my
 * location", to where they are. The browser is only asked for its position after that click, and
 * the position never leaves the page.
 */
export function NearMe({
  places,
  districts,
  districtGroups,
  kinds,
  initialFrom,
  initialKind,
}: {
  places: NearPlace[];
  districts: NearDistrict[];
  districtGroups: DivisionGroup[];
  kinds: NearKind[];
  initialFrom: string;
  initialKind: string;
}) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const [origin, setOrigin] = useState<Origin>({ type: "district", slug: initialFrom });
  const [kind, setKind] = useState(initialKind);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [shown, setShown] = useState(PAGE);

  const districtBySlug = useMemo(() => new Map(districts.map((d) => [d.slug, d])), [districts]);
  const start = origin.type === "district" ? districtBySlug.get(origin.slug) : undefined;
  const point = origin.type === "geo" ? origin : start;

  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of places) counts.set(p.kindKey, (counts.get(p.kindKey) ?? 0) + 1);
    return counts;
  }, [places]);

  const list = useMemo(() => {
    if (!point) return [];
    return nearest(kind ? places.filter((p) => p.kindKey === kind) : places, point.lat, point.lng);
  }, [places, kind, point]);

  function remember(from: string | null, nextKind: string) {
    // Keep the choice in the address, so a reload or a shared link shows the same list.
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (nextKind) params.set("kind", nextKind);
    const query = params.toString();
    try {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    } catch {
      // not worth failing over
    }
  }

  function chooseDistrict(slug: string) {
    if (!districtBySlug.has(slug)) return;
    setOrigin({ type: "district", slug });
    setGeo("idle");
    setShown(PAGE);
    remember(slug, kind);
  }

  function chooseKind(next: string) {
    setKind(next);
    setShown(PAGE);
    remember(origin.type === "district" ? origin.slug : null, next);
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeo("unsupported");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ type: "geo", lat: position.coords.latitude, lng: position.coords.longitude });
        setGeo("idle");
        setShown(PAGE);
        remember(null, kind);
      },
      (error) => setGeo(error.code === 1 ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }

  const heading =
    origin.type === "geo"
      ? t("nearMe.fromYou")
      : t("nearMe.fromDistrict", { name: start?.name ?? "" });
  const geoMessage =
    geo === "denied"
      ? t("nearMe.denied")
      : geo === "unavailable"
        ? t("nearMe.unavailable")
        : geo === "unsupported"
          ? t("nearMe.unsupported")
          : geo === "locating"
            ? t("nearMe.locating")
            : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label={t("nearMe.startLabel")}
          htmlFor="near-me-district"
          className="min-w-0 flex-1 sm:max-w-sm"
        >
          <DistrictSelect
            id="near-me-district"
            divisions={districtGroups}
            placeholder={origin.type === "geo" ? t("nearMe.fromYou") : undefined}
            value={origin.type === "district" ? origin.slug : ""}
            onChange={(e) => chooseDistrict(e.target.value)}
          />
        </Field>
        <Button
          variant="primary"
          icon="pin"
          loading={geo === "locating"}
          onClick={useMyLocation}
          className="h-12"
        >
          {t("nearMe.useLocation")}
        </Button>
      </div>
      <p
        role="status"
        className={geo === "idle" ? "sr-only" : "text-sm font-semibold text-danger"}
        data-state={geo}
      >
        {geoMessage}
      </p>
      <p className="-mt-3 text-sm text-muted">{t("nearMe.privacy")}</p>

      <ChipRow label={t("nearMe.typeLabel")}>
        <FilterChip selected={kind === ""} onClick={() => chooseKind("")}>
          {t("common.all")}
        </FilterChip>
        {kinds.map((k) => (
          <FilterChip
            key={k.key}
            selected={kind === k.key}
            count={formatNumber(kindCounts.get(k.key) ?? 0, lang)}
            onClick={() => chooseKind(k.key)}
          >
            {k.label}
          </FilterChip>
        ))}
      </ChipRow>

      <section aria-labelledby="near-me-results" className="flex flex-col gap-3">
        <h2 id="near-me-results" className="text-h2">
          {heading}
        </h2>
        {list.length ? (
          <>
            <ol className="flex flex-col gap-2">
              {list.slice(0, shown).map((p) => (
                <li
                  key={p.slug}
                  className="flex items-center gap-1 rounded-lg border border-border bg-raised pr-3"
                >
                  <PlaceRow
                    className="min-w-0 flex-1"
                    place={{
                      slug: p.slug,
                      name: p.name,
                      district: { name: p.districtName },
                      kind: { label: p.kindLabel },
                      cover: p.cover ? { w640: p.cover } : null,
                    }}
                    meta={`${p.districtName} · ${p.kindLabel}`}
                    aside={formatDistance(p.distanceKm, lang)}
                  />
                  <a
                    href={directionsUrl(p.lat, p.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("nearMe.directionsTo", { name: p.name })}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    <Icon name="directions" size={16} />
                    <span className="max-sm:sr-only">{t("common.directions")}</span>
                  </a>
                </li>
              ))}
            </ol>
            {shown < list.length ? (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                  {t("common.showMore")}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState body={t("nearMe.empty")} />
        )}
      </section>
    </div>
  );
}
