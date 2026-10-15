"use client";

import geo from "@assets/maps/bangladesh.json";
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
import { Switch } from "@/components/ui/Form";
import { arrowTarget } from "@/components/ui/keyboard";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";

/* DESIGN.md §4.8 — the interactive map of the 64 districts. */

const [, , VB_W, VB_H] = geo.viewBox.split(" ").map(Number) as [number, number, number, number];

export type MapDistrict = (typeof geo.districts)[number];
export const MAP_DISTRICTS: readonly MapDistrict[] = geo.districts;
export const MAP_DIVISIONS = geo.divisions;

export type BangladeshMapProps = {
  /** Slugs of visited districts (filled `--map-visited`, `aria-pressed`). */
  visited?: Iterable<string>;
  /** Slug of the selected district (primary outline, wash fill). */
  selected?: string | null;
  /** Makes districts toggles: called with the district and its new visited state. */
  onToggle?: (slug: string, visited: boolean) => void;
  /** Makes districts selectable (e.g. to filter by district). */
  onSelect?: (slug: string) => void;
  /** Show district names (initial state when `labelToggle` is on). */
  labels?: boolean;
  /** Render the "Show district names" switch. */
  labelToggle?: boolean;
  /** Legend chips under the map; `"divisions"` adds the eight division colours. */
  legend?: boolean | "divisions";
  /** Place counts by district slug, shown in the tooltip. */
  placeCounts?: Record<string, number>;
  /** Accessible name of the map. */
  label?: string;
  /** `full`: up to 520 px (640 px from 768 px). `mini`: up to 240 px (home widget, cards). */
  size?: "full" | "mini";
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
 * The Bangladesh district map. Server-rendered as SVG; interactive once hydrated when it gets
 * `onToggle` or `onSelect`: each district is a button (`aria-pressed` = visited), one tab stop for
 * the whole map, arrow keys move between districts in list order, Enter/Space activates.
 * Hover or focus shows a tooltip (both names, place count).
 */
export function BangladeshMap({
  visited,
  selected = null,
  onToggle,
  onSelect,
  labels = false,
  labelToggle = false,
  legend = false,
  placeCounts,
  label,
  size = "full",
  className,
}: BangladeshMapProps) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const bn = lang === "bn";
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hintId = `${uid}-hint`;
  const tipId = `${uid}-tip`;
  const interactive = Boolean(onToggle || onSelect);

  const visitedSet = useMemo(() => new Set(visited ?? []), [visited]);
  const divisionNames = useMemo(
    () => new Map(MAP_DIVISIONS.map((d) => [d.slug, bn ? d.name_bn : d.name_en])),
    [bn],
  );

  const [showLabels, setShowLabels] = useState(labels);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [focusRing, setFocusRing] = useState(false);
  const selectedIndex = MAP_DISTRICTS.findIndex((d) => d.slug === selected);
  const [cursor, setCursor] = useState(Math.max(0, selectedIndex));
  const refs = useRef<(SVGPathElement | null)[]>([]);

  const pathId = (slug: string) => `${uid}-d-${slug}`;

  function activate(slug: string) {
    onToggle?.(slug, !visitedSet.has(slug));
    onSelect?.(slug);
  }

  function onKeyDown(e: KeyboardEvent<SVGPathElement>, index: number) {
    const district = MAP_DISTRICTS[index]!;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(district.slug);
      return;
    }
    const next = arrowTarget(e.key, index, MAP_DISTRICTS.length);
    if (next === null) return;
    e.preventDefault();
    setCursor(next);
    refs.current[next]?.focus();
  }

  function onFocus(e: FocusEvent<SVGPathElement>, index: number) {
    setCursor(index);
    setFocused(MAP_DISTRICTS[index]!.slug);
    setFocusRing(isFocusVisible(e.currentTarget));
  }

  const tipSlug = hovered ?? focused;
  const tip = tipSlug ? MAP_DISTRICTS.find((d) => d.slug === tipSlug) : undefined;
  const mapLabel = label ?? t("map.bangladesh");

  const svg = (
    <svg
      viewBox={geo.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="block h-auto w-full"
      {...(interactive ? {} : { role: "img", "aria-label": mapLabel })}
    >
      <g>
        {MAP_DISTRICTS.map((d, i) => {
          const isVisited = visitedSet.has(d.slug);
          const isSelected = d.slug === selected;
          const name = bn ? d.name_bn : d.name_en;
          const common = {
            id: pathId(d.slug),
            d: d.d,
            className: "map-area",
            "data-slug": d.slug,
            "data-state": isVisited ? "visited" : undefined,
            "data-selected": isSelected ? "" : undefined,
          };
          if (!interactive) return <path key={d.slug} {...common} />;
          return (
            <path
              key={d.slug}
              {...common}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-interactive=""
              role="button"
              tabIndex={i === cursor ? 0 : -1}
              aria-label={`${name}, ${divisionNames.get(d.division) ?? d.division}`}
              aria-pressed={isVisited}
              aria-current={isSelected ? "true" : undefined}
              aria-describedby={tip?.slug === d.slug ? tipId : undefined}
              onClick={() => activate(d.slug)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onFocus={(e) => onFocus(e, i)}
              onBlur={() => setFocused((f) => (f === d.slug ? null : f))}
              onPointerEnter={() => setHovered(d.slug)}
              onPointerLeave={() => setHovered((h) => (h === d.slug ? null : h))}
            />
          );
        })}
      </g>
      <g aria-hidden="true">
        {MAP_DIVISIONS.map((dv) => (
          <path key={dv.slug} d={dv.d} className="map-divisions" />
        ))}
        {selected && selectedIndex >= 0 ? (
          <use href={`#${pathId(selected)}`} className="map-ring" data-ring="selected" />
        ) : null}
        {focused && focusRing ? (
          <use href={`#${pathId(focused)}`} className="map-ring" data-ring="focus" />
        ) : null}
      </g>
      {showLabels ? (
        <g aria-hidden="true" fontSize={bn ? 10 : 9} textAnchor="middle">
          {MAP_DISTRICTS.map((d) => (
            <text
              key={d.slug}
              x={d.label[0]}
              y={d.label[1]}
              dy="0.35em"
              className="map-label"
              data-on-dark={visitedSet.has(d.slug) ? "" : undefined}
            >
              {bn ? d.name_bn : d.name_en}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  );

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3",
        size === "full" ? "max-w-[520px] md:max-w-[640px]" : "max-w-[240px]",
        className,
      )}
    >
      {labelToggle ? (
        <Switch checked={showLabels} onChange={setShowLabels} label={t("map.showNames")} />
      ) : null}
      <div className="relative">
        {interactive ? (
          <div role="group" aria-label={mapLabel} aria-describedby={hintId}>
            <p id={hintId} className="sr-only">
              {t("map.keyboardHint")}
            </p>
            {svg}
          </div>
        ) : (
          svg
        )}
        {tip ? (
          <div
            id={tipId}
            role="tooltip"
            style={
              {
                left: `${(tip.label[0] / VB_W) * 100}%`,
                top: `${(tip.label[1] / VB_H) * 100}%`,
              } as CSSProperties
            }
            className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 -translate-y-[calc(100%+12px)] animate-fade-in rounded-md border border-border bg-raised px-3 py-2 text-sm shadow-2"
          >
            <span className="block font-semibold">{bn ? tip.name_bn : tip.name_en}</span>
            <span className="block text-xs text-muted" lang={bn ? "en" : "bn"}>
              {bn ? tip.name_en : tip.name_bn}
            </span>
            {placeCounts?.[tip.slug] !== undefined ? (
              <span className="num mt-0.5 block text-xs font-semibold text-primary">
                {t("common.places", { count: placeCounts[tip.slug]! })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {legend ? <MapLegend divisions={legend === "divisions"} /> : null}
    </div>
  );
}

function Swatch({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "inline-block size-3.5 shrink-0 rounded-xs border border-border-strong",
        className,
      )}
    />
  );
}

/** Legend chips: Visited / Not yet, and optionally the division colours. */
export function MapLegend({
  divisions = false,
  wish = false,
  className,
}: {
  divisions?: boolean;
  /** World map: add "Want to go". */
  wish?: boolean;
  className?: string;
}) {
  const t = useT();
  const bn = contentLocale(useLocale()) === "bn";
  const item =
    "inline-flex h-8 items-center gap-2 rounded-pill bg-surface-2 px-3 text-xs font-semibold";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ul aria-label={t("map.legend")} className="flex flex-wrap gap-2">
        <li className={item}>
          <Swatch className="bg-map-visited" />
          {t("map.visited")}
        </li>
        {wish ? (
          <li className={item}>
            <Swatch className="bg-map-wish" />
            {t("map.wish")}
          </li>
        ) : null}
        <li className={item}>
          <Swatch className="bg-map-land" />
          {t("map.notYet")}
        </li>
      </ul>
      {divisions ? (
        <ul aria-label={t("map.divisions")} className="flex flex-wrap gap-2">
          {MAP_DIVISIONS.map((d) => (
            <li key={d.slug} className={item}>
              <Swatch style={{ background: `var(--color-division-${d.slug})` }} />
              {bn ? d.name_bn : d.name_en}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
