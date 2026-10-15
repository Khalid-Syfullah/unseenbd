import bdJson from "@assets/maps/bangladesh.json";
import worldJson from "@assets/maps/world.json";
import { describe, expect, it } from "vitest";
import { DISTRICT_SLUGS } from "@/lib/visited/districts";
import { project, spinFrame, tiltFrame, fillCount, MAX_TILT } from "./animate";
import {
  buildBangladeshGeo,
  buildWorldGeo,
  insideRing,
  labelPoint,
  parseRings,
  ringArea,
} from "./geo";
import { contains } from "./layout";
import { CARD_THEMES, cardTheme, luminance } from "./themes";
import { THEME_KEYS } from "./types";

describe("path parsing", () => {
  it("splits sub-paths into rings and measures them", () => {
    const rings = parseRings("M0,0L10,0L10,10L0,10Z M20,20L30,20L30,30Z");
    expect(rings).toHaveLength(2);
    expect(Math.abs(ringArea(rings[0]!))).toBe(100);
    expect(Math.abs(ringArea(rings[1]!))).toBe(50);
  });

  it("finds a label point inside a crescent-like shape", () => {
    // A "C": its centroid falls in the gap.
    const [ring] = parseRings("M0,0L30,0L30,5L5,5L5,25L30,25L30,30L0,30Z");
    const p = labelPoint(ring!);
    expect(insideRing(ring!, p.x, p.y)).toBe(true);
  });
});

describe("map geometry", () => {
  const bd = buildBangladeshGeo(bdJson);
  const world = buildWorldGeo(worldJson);

  it("has the 64 districts, keyed by the same slugs as the visited store", () => {
    expect(bd.regions.map((r) => r.key).sort()).toEqual([...DISTRICT_SLUGS].sort());
    expect(bd.outlines).toHaveLength(8);
    for (const r of bd.regions) {
      expect(contains(bd.viewBox, r.bounds), r.key).toBe(true);
      expect(r.anchor.x).toBeGreaterThanOrEqual(r.bounds.x);
      expect(r.anchor.x).toBeLessThanOrEqual(r.bounds.x + r.bounds.w);
      expect(r.anchor.y).toBeGreaterThanOrEqual(r.bounds.y);
      expect(r.anchor.y).toBeLessThanOrEqual(r.bounds.y + r.bounds.h);
      expect(r.area).toBeGreaterThan(0);
    }
  });

  it("merges world shapes that share a code", () => {
    const keys = world.regions.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("BD");
    expect(world.regions.length).toBeGreaterThan(190);
  });
});

describe("video timelines", () => {
  it("3D: starts flat and empty, leans back while filling, ends flat and full", () => {
    expect(tiltFrame(0)).toEqual({ fill: 0, tilt: 0, spin: 0 });
    expect(tiltFrame(0.5).tilt).toBeCloseTo(MAX_TILT);
    expect(tiltFrame(0.5).fill).toBeGreaterThan(0);
    expect(tiltFrame(0.5).fill).toBeLessThan(1);
    expect(tiltFrame(1)).toEqual({ fill: 1, tilt: 0, spin: 0 });
    let last = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const { fill } = tiltFrame(t);
      expect(fill).toBeGreaterThanOrEqual(last);
      last = fill;
    }
  });

  it("360°: one full turn with everything filled", () => {
    expect(spinFrame(0).spin).toBe(0);
    expect(spinFrame(1).spin).toBeCloseTo(Math.PI * 2);
    expect(spinFrame(0.5).fill).toBe(1);
  });

  it("projects with perspective and never grows past the flat card when pushed back", () => {
    expect(project(100, 0, 1000)).toEqual({ pos: 100, scale: 1 });
    expect(project(100, MAX_TILT, 1000).scale).toBeLessThan(1);
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const push = 50 * Math.abs(Math.sin(a));
      expect(project(-50, a, 180, push).scale).toBeLessThanOrEqual(1 + 1e-9);
      expect(project(50, a, 180, push).scale).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("splits a fill level into whole regions and a fading next one", () => {
    expect(fillCount(0, 10)).toEqual({ whole: 0, partial: 0 });
    expect(fillCount(1, 10)).toEqual({ whole: 10, partial: 0 });
    const half = fillCount(0.55, 10);
    expect(half.whole).toBe(5);
    expect(half.partial).toBeCloseTo(0.5);
  });
});

describe("themes", () => {
  it("has the six themes from themes.json, in order", () => {
    expect(CARD_THEMES.map((t) => t.key)).toEqual([...THEME_KEYS]);
    expect(cardTheme("jamdani").pattern).toBe(true);
    expect(cardTheme("nope").key).toBe("dusk");
  });

  it("keeps text readable on every theme background (WCAG AA)", () => {
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const theme of CARD_THEMES) {
      for (const bg of theme.bg)
        expect(contrast(theme.text, bg), theme.key).toBeGreaterThanOrEqual(4.5);
    }
  });
});
