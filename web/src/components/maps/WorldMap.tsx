"use client";

import world from "@assets/maps/world.json";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/components/ui/cn";
import { arrowTarget } from "@/components/ui/keyboard";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";
import { MapLegend } from "./BangladeshMap";

/* DESIGN.md §4.8 — world map: visited / want to go / none. */

export type WorldStatus = "visited" | "wish";

export type WorldCountry = {
  /** ISO 3166-1 alpha-2 code, or a slug of the English name for the few shapes without one. */
  key: string;
  nameEn: string;
  nameBn: string;
  continent: string;
  sovereign: boolean;
  /** All shapes of the country as one path. */
  d: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Countries from `world.json`, shapes that share a code merged into one entry. */
export const WORLD_COUNTRIES: readonly WorldCountry[] = (() => {
  const byKey = new Map<string, WorldCountry>();
  for (const c of world.countries) {
    const key = c.iso2 ?? slugify(c.name_en);
    const existing = byKey.get(key);
    if (existing) {
      existing.d += c.d;
      // Name the merged entry after the sovereign shape (Australia, not its islands).
      if (c.sovereign && !existing.sovereign) {
        Object.assign(existing, { nameEn: c.name_en, nameBn: c.name_bn, sovereign: true });
      }
      continue;
    }
    byKey.set(key, {
      key,
      nameEn: c.name_en,
      nameBn: c.name_bn,
      continent: c.continent,
      sovereign: c.sovereign,
      d: c.d,
    });
  }
  return [...byKey.values()];
})();

export type WorldMapProps = {
  /** Status by country key; countries not listed are unmarked. */
  value?: Record<string, WorldStatus>;
  /**
   * What a click paints: clicking a country already in this state clears it. `"clear"` makes
   * every click clear the country.
   */
  mark?: WorldStatus | "clear";
  /** Makes the map interactive. */
  onChange?: (key: string, status: WorldStatus | null) => void;
  legend?: boolean;
  label?: string;
  className?: string;
};

function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

/**
 * World map (Equal Earth). Server-rendered SVG; with `onChange` every country is a button: one tab
 * stop, arrow keys move through countries in list order, Enter/Space marks or clears. The country
 * under the pointer or focus is named in the caption under the map.
 */
export function WorldMap({
  value = {},
  mark = "visited",
  onChange,
  legend = false,
  label,
  className,
}: WorldMapProps) {
  const t = useT();
  const bn = contentLocale(useLocale()) === "bn";
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const interactive = Boolean(onChange);
  const [cursor, setCursor] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [focusRing, setFocusRing] = useState(false);
  const refs = useRef<(SVGPathElement | null)[]>([]);
  const byKey = useMemo(() => new Map(WORLD_COUNTRIES.map((c) => [c.key, c])), []);

  const statusLabel = (status: WorldStatus | undefined) =>
    status === "visited" ? t("map.visited") : status === "wish" ? t("map.wish") : t("map.notYet");

  function activate(key: string) {
    const current = value[key];
    onChange?.(key, mark === "clear" || current === mark ? null : mark);
  }

  function onKeyDown(e: KeyboardEvent<SVGPathElement>, index: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(WORLD_COUNTRIES[index]!.key);
      return;
    }
    const next = arrowTarget(e.key, index, WORLD_COUNTRIES.length);
    if (next === null) return;
    e.preventDefault();
    setCursor(next);
    refs.current[next]?.focus();
  }

  function onFocus(e: FocusEvent<SVGPathElement>, index: number) {
    setCursor(index);
    setFocused(WORLD_COUNTRIES[index]!.key);
    setFocusRing(isFocusVisible(e.currentTarget));
  }

  const pathId = (key: string) => `${uid}-c-${key}`;
  const mapLabel = label ?? t("map.world");
  const current = byKey.get(hovered ?? focused ?? "");

  const svg = (
    <svg
      viewBox={world.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="block h-auto w-full"
      {...(interactive ? {} : { role: "img", "aria-label": mapLabel })}
    >
      <g style={{ "--map-stroke": 0.4 } as CSSProperties}>
        {WORLD_COUNTRIES.map((c, i) => {
          const status = value[c.key];
          const name = bn ? c.nameBn : c.nameEn;
          const common = {
            id: pathId(c.key),
            d: c.d,
            className: "map-area",
            "data-state": status,
          };
          if (!interactive) return <path key={c.key} {...common} />;
          return (
            <path
              key={c.key}
              {...common}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-interactive=""
              role="button"
              tabIndex={i === cursor ? 0 : -1}
              aria-label={`${name}: ${statusLabel(status)}`}
              aria-pressed={mark === "clear" ? status !== undefined : status === mark}
              onClick={() => activate(c.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onFocus={(e) => onFocus(e, i)}
              onBlur={() => setFocused((f) => (f === c.key ? null : f))}
              onPointerEnter={() => setHovered(c.key)}
              onPointerLeave={() => setHovered((h) => (h === c.key ? null : h))}
            />
          );
        })}
      </g>
      {focused && focusRing ? (
        <use
          href={`#${pathId(focused)}`}
          className="map-ring"
          data-ring="focus"
          style={{ strokeWidth: 1.5 }}
        />
      ) : null}
    </svg>
  );

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {interactive ? (
        <div role="group" aria-label={mapLabel} aria-describedby={`${uid}-hint`}>
          <p id={`${uid}-hint`} className="sr-only">
            {t("map.keyboardHint")}
          </p>
          {svg}
        </div>
      ) : (
        svg
      )}
      {interactive ? (
        <p aria-hidden className="min-h-6 text-sm text-muted">
          {current ? (
            <>
              <span className="font-semibold text-text">
                {bn ? current.nameBn : current.nameEn}
              </span>
              {" · "}
              {statusLabel(value[current.key])}
            </>
          ) : null}
        </p>
      ) : null}
      {legend ? <MapLegend wish /> : null}
    </div>
  );
}
