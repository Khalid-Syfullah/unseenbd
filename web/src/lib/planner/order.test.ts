import { describe, expect, it } from "vitest";
import {
  bruteForceOrder,
  nearestNeighbourOrder,
  orderStops,
  routeKm,
  twoOpt,
  type DistanceFn,
} from "./order";

/** Stops on a line: id n sits at km n × 10 (start is 0). */
const line: DistanceFn = (a, b) => Math.abs(a - b) * 10;

/** Points on a plane by id. */
function plane(points: Record<number, [number, number]>): DistanceFn {
  return (a, b) => {
    const [ax, ay] = points[a]!;
    const [bx, by] = points[b]!;
    return Math.hypot(ax - bx, ay - by);
  };
}

/** The best order the slow way, for checking. */
function exhaustive(start: number, stops: number[], dist: DistanceFn, ret: boolean): number {
  let best = Infinity;
  const go = (done: number[], left: number[]) => {
    if (!left.length) {
      best = Math.min(best, routeKm(start, done, dist, ret));
      return;
    }
    left.forEach((s, i) => go([...done, s], [...left.slice(0, i), ...left.slice(i + 1)]));
  };
  go([], stops);
  return best;
}

describe("route ordering", () => {
  it("measures a route with and without the way back", () => {
    expect(routeKm(0, [1, 3, 2], line, false)).toBe(40);
    expect(routeKm(0, [1, 3, 2], line, true)).toBe(60);
    expect(routeKm(0, [], line, true)).toBe(0);
  });

  it("leaves zero or one stop alone", () => {
    expect(orderStops(0, [], line, true)).toEqual([]);
    expect(orderStops(0, [4], line, true)).toEqual([4]);
  });

  it("brute-forces up to 7 stops", () => {
    expect(orderStops(0, [5, 2, 7, 1, 3, 6, 4], line, false)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("takes the way back into account", () => {
    // Start in the middle: one-way visits the near side first; with return either side works.
    const pts = plane({ 0: [0, 0], 1: [-1, 0], 2: [3, 0] });
    expect(orderStops(0, [2, 1], pts, false)).toEqual([1, 2]);
    expect(routeKm(0, orderStops(0, [2, 1], pts, true), pts, true)).toBe(8);
  });

  it("keeps the given order when every order is equally short", () => {
    const flat: DistanceFn = () => 10;
    expect(bruteForceOrder(0, [3, 1, 2], flat, true)).toEqual([3, 1, 2]);
  });

  it("uses nearest neighbour + 2-opt above 7 stops and reaches a 2-opt optimum", () => {
    const stops = [9, 3, 12, 1, 7, 5, 11, 2, 8, 4, 10, 6];
    expect(orderStops(0, stops, line, false)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const ret = orderStops(0, stops, line, true);
    expect(routeKm(0, ret, line, true)).toBe(240);
  });

  it("improves a nearest-neighbour tour with 2-opt", () => {
    // A ring of 9 points where greedy goes the wrong way around once.
    const pts: Record<number, [number, number]> = { 0: [0, 0] };
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    ids.forEach((id, i) => {
      const a = (i / ids.length) * 2 * Math.PI;
      pts[id] = [Math.cos(a) * 10 + 10, Math.sin(a) * 10 + (i % 2 ? 0.8 : -0.8)];
    });
    const dist = plane(pts);
    const nn = nearestNeighbourOrder(0, ids, dist);
    const opt = twoOpt(0, nn, dist, true);
    expect(routeKm(0, opt, dist, true)).toBeLessThanOrEqual(routeKm(0, nn, dist, true));
    expect(routeKm(0, orderStops(0, ids, dist, true), dist, true)).toBeCloseTo(
      exhaustive(0, ids, dist, true),
      6,
    );
  });

  it("matches the exhaustive optimum for brute-forced sizes, one-way and round trips", () => {
    const pts = plane({
      0: [0, 0],
      1: [5, 1],
      2: [2, 7],
      3: [8, 8],
      4: [1, 3],
      5: [9, 2],
      6: [4, 4],
    });
    const stops = [1, 2, 3, 4, 5, 6];
    for (const ret of [false, true]) {
      expect(routeKm(0, orderStops(0, stops, pts, ret), pts, ret)).toBeCloseTo(
        exhaustive(0, stops, pts, ret),
        9,
      );
    }
  });
});
