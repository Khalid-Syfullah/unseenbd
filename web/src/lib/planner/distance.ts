import { haversineKm } from "@/lib/geo";
import {
  HILL_ROAD_FACTOR,
  HILL_TRACTS,
  KM_STEP,
  LEG_EXTRA_HOURS,
  LEG_EXTRA_KM,
  MIN_LEG_KM,
  ROAD_FACTOR,
  ROAD_SPEED_KMH,
} from "./constants";
import type { PlannerDistrict, RoadKmLookup } from "./types";

/** Round to the nearest multiple of `step` (halves round up). */
export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Round to the nearest half (0.5) — used for hours. */
export function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Normalise a road distance to the planner's grid: nearest 5 km, at least 10 km. */
function toLegKm(km: number): number {
  return Math.max(MIN_LEG_KM, roundTo(km, KM_STEP));
}

/**
 * The model's road distance between two districts: haversine between the centroids × road factor
 * (1.45 when either end is in the hill tracts, else 1.3) + 8 km, rounded to the nearest 5 km,
 * at least 10 km.
 */
export function estimateLegKm(a: PlannerDistrict, b: PlannerDistrict): number {
  const factor =
    HILL_TRACTS.has(a.slug) || HILL_TRACTS.has(b.slug) ? HILL_ROAD_FACTOR : ROAD_FACTOR;
  return toLegKm(haversineKm(a.lat, a.lng, b.lat, b.lng) * factor + LEG_EXTRA_KM);
}

/**
 * Leg distance: the real road distance when `roadKm` knows the pair (on the same 5 km grid),
 * otherwise the model's estimate. The same district twice is 0 km.
 */
export function legKm(a: PlannerDistrict, b: PlannerDistrict, roadKm?: RoadKmLookup): number {
  if (a.id === b.id) return 0;
  const real = roadKm?.(a.id, b.id);
  if (typeof real === "number" && Number.isFinite(real) && real > 0) return toLegKm(real);
  return estimateLegKm(a, b);
}

/** Hours on the road: km / 42 + 0.5, rounded to the nearest half hour. */
export function legHours(km: number): number {
  if (km <= 0) return 0;
  return roundHalf(km / ROAD_SPEED_KMH + LEG_EXTRA_HOURS);
}

/** A symmetric lookup over known road distances (`[fromId, toId, km]`). */
export function roadKmLookup(pairs: readonly (readonly [number, number, number])[]): RoadKmLookup {
  const map = new Map<string, number>();
  for (const [a, b, km] of pairs) {
    map.set(`${a}-${b}`, km);
    if (!map.has(`${b}-${a}`)) map.set(`${b}-${a}`, km);
  }
  return (a, b) => map.get(`${a}-${b}`);
}
