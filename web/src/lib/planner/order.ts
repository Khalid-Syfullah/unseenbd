import { BRUTE_FORCE_MAX } from "./constants";

/** Distance between two stops (by id). */
export type DistanceFn = (a: number, b: number) => number;

/** Total km of start → stops… (→ start when `returnToStart`). */
export function routeKm(
  start: number,
  stops: readonly number[],
  dist: DistanceFn,
  returnToStart: boolean,
): number {
  let total = 0;
  let at = start;
  for (const s of stops) {
    total += dist(at, s);
    at = s;
  }
  if (returnToStart && stops.length) total += dist(at, start);
  return total;
}

const EPS = 1e-9;

/** Every permutation of `items`, in lexicographic order of their positions. */
function* permutations<T>(items: readonly T[]): Generator<T[]> {
  const n = items.length;
  const idx = items.map((_, i) => i);
  yield idx.map((i) => items[i]!);
  // Narayana's next-permutation.
  for (;;) {
    let i = n - 2;
    while (i >= 0 && idx[i]! > idx[i + 1]!) i--;
    if (i < 0) return;
    let j = n - 1;
    while (idx[j]! < idx[i]!) j--;
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    for (let a = i + 1, b = n - 1; a < b; a++, b--) [idx[a], idx[b]] = [idx[b]!, idx[a]!];
    yield idx.map((k) => items[k]!);
  }
}

/** The shortest order by trying every permutation; ties keep the earliest (closest to input). */
export function bruteForceOrder(
  start: number,
  stops: readonly number[],
  dist: DistanceFn,
  returnToStart: boolean,
): number[] {
  let best = [...stops];
  let bestKm = routeKm(start, best, dist, returnToStart);
  for (const perm of permutations(stops)) {
    const km = routeKm(start, perm, dist, returnToStart);
    if (km < bestKm - EPS) {
      best = perm;
      bestKm = km;
    }
  }
  return best;
}

/** Nearest neighbour from the start; ties go to the stop listed first. */
export function nearestNeighbourOrder(
  start: number,
  stops: readonly number[],
  dist: DistanceFn,
): number[] {
  const left = [...stops];
  const out: number[] = [];
  let at = start;
  while (left.length) {
    let bi = 0;
    for (let i = 1; i < left.length; i++) {
      if (dist(at, left[i]!) < dist(at, left[bi]!) - EPS) bi = i;
    }
    at = left.splice(bi, 1)[0]!;
    out.push(at);
  }
  return out;
}

/**
 * 2-opt: reverse any stretch of stops that shortens the route, until nothing does. The start
 * stays first; with `returnToStart` the route is a loop back to it, otherwise the end is free.
 */
export function twoOpt(
  start: number,
  stops: readonly number[],
  dist: DistanceFn,
  returnToStart: boolean,
): number[] {
  let route = [...stops];
  let bestKm = routeKm(start, route, dist, returnToStart);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const next = [
          ...route.slice(0, i),
          ...route.slice(i, j + 1).reverse(),
          ...route.slice(j + 1),
        ];
        const km = routeKm(start, next, dist, returnToStart);
        if (km < bestKm - EPS) {
          route = next;
          bestKm = km;
          improved = true;
        }
      }
    }
  }
  return route;
}

/**
 * The visiting order that keeps total km lowest (including the way back when `returnToStart`):
 * every permutation for up to 7 stops, else nearest neighbour improved by 2-opt.
 */
export function orderStops(
  start: number,
  stops: readonly number[],
  dist: DistanceFn,
  returnToStart: boolean,
): number[] {
  if (stops.length < 2) return [...stops];
  if (stops.length <= BRUTE_FORCE_MAX) return bruteForceOrder(start, stops, dist, returnToStart);
  return twoOpt(start, nearestNeighbourOrder(start, stops, dist), dist, returnToStart);
}
