"use client";

import geo from "@assets/maps/bangladesh.json";
import { Fragment } from "react";
import { cn } from "@/components/ui/cn";
import { useT } from "@/i18n/client";
import { localizeDigits } from "@/lib/format";
import { useNumberLang } from "./shared";

/* DESIGN.md §4.9 — route map: numbered pins (primary circles, white numbers) and a dashed sun-red
 * path between them, on the district map. */

const POINTS = new Map(geo.districts.map((d) => [d.slug, d.label as [number, number]]));

export type RouteStop = { slug: string; name: string };

/**
 * `stops` in travel order; with `loop` the path goes back to the first stop. Pins are numbered from
 * 1 (the start); a stop visited twice keeps its first number.
 */
export function RouteMap({
  stops,
  loop,
  className,
}: {
  stops: RouteStop[];
  loop: boolean;
  className?: string;
}) {
  const t = useT();
  const lang = useNumberLang();
  const path = (loop && stops.length > 1 ? [...stops, stops[0]!] : stops)
    .map((s) => POINTS.get(s.slug))
    .filter((p): p is [number, number] => Boolean(p));
  const onRoute = new Set(stops.map((s) => s.slug));
  const label = t("plan.mapLabel", {
    stops: (loop ? [...stops, stops[0]!] : stops).map((s) => s.name).join(" → "),
  });

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <svg
        viewBox={geo.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
        className="mx-auto block h-auto w-full max-w-[440px]"
      >
        <g>
          {geo.districts.map((d) => (
            <path
              key={d.slug}
              d={d.d}
              className="map-area"
              data-selected={onRoute.has(d.slug) ? "" : undefined}
            />
          ))}
        </g>
        <g aria-hidden="true">
          {geo.divisions.map((dv) => (
            <path key={dv.slug} d={dv.d} className="map-divisions" />
          ))}
        </g>
        {path.length > 1 ? (
          <polyline
            points={path.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="var(--sun)"
            strokeWidth={3}
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {stops.map((s, i) => {
          const p = POINTS.get(s.slug);
          if (!p) return null;
          return (
            <Fragment key={s.slug}>
              <circle
                cx={p[0]}
                cy={p[1]}
                r={14}
                fill="var(--primary)"
                stroke="var(--bg-raised)"
                strokeWidth={2.5}
              />
              <text
                x={p[0]}
                y={p[1]}
                dy="0.36em"
                textAnchor="middle"
                fontSize={15}
                fontWeight={700}
                fill="var(--on-primary)"
              >
                {localizeDigits(i + 1, lang)}
              </text>
            </Fragment>
          );
        })}
      </svg>
      <figcaption>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
          {stops.map((s, i) => (
            <li key={s.slug} className="inline-flex items-center gap-1.5">
              {i > 0 ? (
                <span aria-hidden className="text-muted">
                  →
                </span>
              ) : null}
              <span
                aria-hidden
                className="num inline-flex size-6 items-center justify-center rounded-pill bg-primary text-xs font-bold text-on-primary"
              >
                {localizeDigits(i + 1, lang)}
              </span>
              <span className="font-semibold">{s.name}</span>
            </li>
          ))}
          {loop && stops.length > 1 ? (
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-muted">
                →
              </span>
              <span
                aria-hidden
                className="num inline-flex size-6 items-center justify-center rounded-pill bg-primary text-xs font-bold text-on-primary"
              >
                {localizeDigits(1, lang)}
              </span>
              <span className="font-semibold">{stops[0]!.name}</span>
            </li>
          ) : null}
        </ol>
      </figcaption>
    </figure>
  );
}
