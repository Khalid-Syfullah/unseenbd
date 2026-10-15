/**
 * Map geometry for the card: the 64 districts (`assets/maps/bangladesh.json`) or the world's
 * countries (`assets/maps/world.json`), with bounds and a label point per region. The map files
 * only use absolute `M`, `L` and `Z` commands, which is all the parser here understands.
 */
import type { Rect } from "./layout";
import type { CardMapKind } from "./types";

export type Point = { x: number; y: number };

export type Region = {
  /** District slug or country key (ISO2, or a slug for the few shapes without one). */
  key: string;
  nameEn: string;
  nameBn: string;
  /** Division slug or continent name. */
  group: string;
  d: string;
  bounds: Rect;
  /** Where its name and pins go: inside the largest shape. */
  anchor: Point;
  /** Area in map units, for label priority. */
  area: number;
};

export type CardGeo = {
  kind: CardMapKind;
  /** The map's own coordinate box (`viewBox`). */
  viewBox: Rect;
  /** Box around every shape (tighter than the viewBox). */
  bounds: Rect;
  regions: Region[];
  /** Division outlines (Bangladesh only), drawn over the districts. */
  outlines: string[];
};

/** Splits a path into rings of `[x0, y0, x1, y1, …]`. */
export function parseRings(d: string): number[][] {
  const rings: number[][] = [];
  let ring: number[] | null = null;
  const re = /([MLZmlz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;
  let pending: number | null = null;
  for (const m of d.matchAll(re)) {
    if (m[1]) {
      const cmd = m[1].toUpperCase();
      if (cmd === "M") {
        if (ring && ring.length >= 6) rings.push(ring);
        ring = [];
      } else if (cmd === "Z") {
        if (ring && ring.length >= 6) rings.push(ring);
        ring = null;
      }
      pending = null;
      continue;
    }
    const n = Number(m[2]);
    if (pending === null) pending = n;
    else {
      (ring ??= []).push(pending, n);
      pending = null;
    }
  }
  if (ring && ring.length >= 6) rings.push(ring);
  return rings;
}

/** Signed area of a ring (shoelace). */
export function ringArea(ring: number[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i += 2) {
    const j = (i + 2) % ring.length;
    a += ring[i]! * ring[j + 1]! - ring[j]! * ring[i + 1]!;
  }
  return a / 2;
}

export function ringBounds(rings: number[][]): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = ring[i]!;
      const y = ring[i + 1]!;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function unionRect(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Even-odd point-in-ring test. */
export function insideRing(ring: number[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i]!;
    const yi = ring[i + 1]!;
    const xj = ring[j]!;
    const yj = ring[j + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * A point well inside a ring: its centroid when that is inside, otherwise the middle of the
 * widest horizontal run through the ring near its centre (good for crescents and long coasts).
 */
export function labelPoint(ring: number[]): Point {
  const a = ringArea(ring);
  let cx = 0;
  let cy = 0;
  if (Math.abs(a) > 1e-9) {
    for (let i = 0; i < ring.length; i += 2) {
      const j = (i + 2) % ring.length;
      const cross = ring[i]! * ring[j + 1]! - ring[j]! * ring[i + 1]!;
      cx += (ring[i]! + ring[j]!) * cross;
      cy += (ring[i + 1]! + ring[j + 1]!) * cross;
    }
    cx /= 6 * a;
    cy /= 6 * a;
    if (insideRing(ring, cx, cy)) return { x: cx, y: cy };
  }
  const b = ringBounds([ring]);
  let best: Point = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  let bestW = -1;
  for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
    const y = b.y + b.h * f;
    const xs: number[] = [];
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const yi = ring[i + 1]!;
      const yj = ring[j + 1]!;
      if (yi > y !== yj > y) {
        const xi = ring[i]!;
        const xj = ring[j]!;
        xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const w = xs[k + 1]! - xs[k]!;
      if (w > bestW) {
        bestW = w;
        best = { x: (xs[k]! + xs[k + 1]!) / 2, y };
      }
    }
    if (bestW > b.w * 0.35) break;
  }
  return best;
}

/** Bounds, label point and area of one region's path. */
export function shapeInfo(d: string): { bounds: Rect; anchor: Point; area: number } {
  const rings = parseRings(d);
  const bounds = ringBounds(rings);
  let largest: number[] | null = null;
  let largestArea = 0;
  let area = 0;
  for (const ring of rings) {
    const a = Math.abs(ringArea(ring));
    area += a;
    if (a > largestArea) {
      largestArea = a;
      largest = ring;
    }
  }
  const anchor = largest
    ? labelPoint(largest)
    : { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
  return { bounds, anchor, area };
}

function parseViewBox(viewBox: string): Rect {
  const [x = 0, y = 0, w = 0, h = 0] = viewBox.split(/[\s,]+/).map(Number);
  return { x, y, w, h };
}

type BdJson = {
  viewBox: string;
  districts: { slug: string; name_en: string; name_bn: string; division: string; d: string }[];
  divisions: { slug: string; d: string }[];
};

type WorldJson = {
  viewBox: string;
  countries: {
    iso2: string | null;
    name_en: string;
    name_bn: string;
    continent: string;
    sovereign: boolean;
    d: string;
  }[];
};

/** Builds the Bangladesh geometry from `bangladesh.json`. */
export function buildBangladeshGeo(json: BdJson): CardGeo {
  const regions = json.districts.map((d) => ({
    key: d.slug,
    nameEn: d.name_en,
    nameBn: d.name_bn,
    group: d.division,
    d: d.d,
    ...shapeInfo(d.d),
  }));
  return {
    kind: "bangladesh",
    viewBox: parseViewBox(json.viewBox),
    bounds: unionRect(regions.map((r) => r.bounds)),
    regions,
    outlines: json.divisions.map((d) => d.d),
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Builds the world geometry from `world.json`; shapes with the same code become one region. */
export function buildWorldGeo(json: WorldJson): CardGeo {
  const byKey = new Map<
    string,
    { nameEn: string; nameBn: string; group: string; d: string; sovereign: boolean }
  >();
  for (const c of json.countries) {
    const key = c.iso2 ?? slugify(c.name_en);
    const existing = byKey.get(key);
    if (existing) {
      existing.d += c.d;
      if (c.sovereign && !existing.sovereign) {
        Object.assign(existing, { nameEn: c.name_en, nameBn: c.name_bn, sovereign: true });
      }
      continue;
    }
    byKey.set(key, {
      nameEn: c.name_en,
      nameBn: c.name_bn,
      group: c.continent,
      d: c.d,
      sovereign: c.sovereign,
    });
  }
  const regions = [...byKey].map(([key, c]) => ({
    key,
    nameEn: c.nameEn,
    nameBn: c.nameBn,
    group: c.group,
    d: c.d,
    ...shapeInfo(c.d),
  }));
  return {
    kind: "world",
    viewBox: parseViewBox(json.viewBox),
    bounds: unionRect(regions.map((r) => r.bounds)),
    regions,
    outlines: [],
  };
}

const geoCache = new Map<CardMapKind, Promise<CardGeo>>();

/** Loads a map's geometry once (the JSON is a separate chunk, fetched when the card maker opens). */
export function loadGeo(kind: CardMapKind): Promise<CardGeo> {
  let p = geoCache.get(kind);
  if (!p) {
    p =
      kind === "world"
        ? import("@assets/maps/world.json").then((m) =>
            buildWorldGeo((m.default ?? m) as WorldJson),
          )
        : import("@assets/maps/bangladesh.json").then((m) =>
            buildBangladeshGeo((m.default ?? m) as BdJson),
          );
    p.catch(() => geoCache.delete(kind));
    geoCache.set(kind, p);
  }
  return p;
}
