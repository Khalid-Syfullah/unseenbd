import bdJson from "@assets/maps/bangladesh.json";
import { describe, expect, it } from "vitest";
import { buildBangladeshGeo } from "./geo";
import {
  CARD_SIZES,
  cardLayout,
  contains,
  fitContain,
  fitCover,
  layoutBlocks,
  levelLayout,
  overlaps,
  safeArea,
  stampCell,
  stampGrid,
  zoomViewport,
  type Rect,
} from "./layout";
import { layoutFor, mapView, visualAspect } from "./render";
import { CARD_THEMES } from "./themes";
import { CARD_SIZE_KEYS, CARD_TYPES, type CardInput } from "./types";

const geo = buildBangladeshGeo(bdJson);

const scaleRect = (r: Rect, k: number): Rect => ({
  x: r.x * k,
  y: r.y * k,
  w: r.w * k,
  h: r.h * k,
});

function baseInput(over: Partial<CardInput> = {}): CardInput {
  return {
    map: "bangladesh",
    type: "map",
    theme: "mist",
    size: "square",
    visitedIds: ["dhaka", "sylhet", "khulna"],
    name: "",
    caption: "",
    hometown: null,
    labelSize: "small",
    options: { colouredDistricts: false, districtPhotos: false, zoomHometown: false },
    pins: [],
    photo: null,
    progress: 0.5,
    lang: "en",
    url: "unseenbd.example/my-bangladesh",
    text: {
      title: "My Bangladesh",
      count: "3 / 64",
      countLabel: "districts visited · 5%",
      home: "",
      levelTitle: "Not ranked yet",
      levelNext: "7 more to Bangladesh Explorer",
      passportNote: "A game passport, not an official document",
      passportMore: "+{count}",
      passportEmpty: "No stamps yet",
      regionNames: {},
    },
    ...over,
  };
}

describe("card sizes", () => {
  it("has the four ratios from the brief", () => {
    const ratio = (k: keyof typeof CARD_SIZES) => CARD_SIZES[k].w / CARD_SIZES[k].h;
    expect(ratio("link")).toBeCloseTo(1.91, 2);
    expect(ratio("post")).toBeCloseTo(4 / 5, 5);
    expect(ratio("square")).toBe(1);
    expect(ratio("story")).toBeCloseTo(9 / 16, 5);
  });

  it("keeps a margin on every side, and clears story overlays", () => {
    for (const key of CARD_SIZE_KEYS) {
      const size = CARD_SIZES[key];
      const safe = safeArea(size);
      expect(safe.x).toBeGreaterThan(0);
      expect(safe.y).toBeGreaterThan(0);
      expect(safe.x + safe.w).toBeLessThan(size.w);
      expect(safe.y + safe.h).toBeLessThan(size.h);
    }
    const story = safeArea(CARD_SIZES.story);
    expect(story.y).toBeGreaterThanOrEqual(1920 * 0.1);
    expect(1920 - (story.y + story.h)).toBeGreaterThanOrEqual(1920 * 0.12);
  });
});

describe("cardLayout", () => {
  const flagSets = [false, true].flatMap((caption) =>
    [false, true].flatMap((photo) =>
      [false, true].flatMap((home) => [0, 3, 6, 9].map((pins) => ({ caption, photo, home, pins }))),
    ),
  );
  const aspects = { map: 600 / 760, level: 0.85, passport: 1 } as const;

  it.each(CARD_TYPES.flatMap((type) => CARD_SIZE_KEYS.map((size) => [type, size] as const)))(
    "%s card at %s: every block inside the safe area and none overlapping",
    (type, size) => {
      for (const flags of flagSets) {
        for (const visualAspect of [aspects[type], 2]) {
          const layout = cardLayout(type, size, { ...flags, visualAspect });
          const blocks = Object.entries(layoutBlocks(layout));
          for (const [name, rect] of blocks) {
            expect(rect.w, `${name} width`).toBeGreaterThan(0);
            expect(rect.h, `${name} height`).toBeGreaterThan(0);
            expect(contains(layout.safe, rect), `${name} inside safe area`).toBe(true);
          }
          // The hero block groups title/count/label/home/avatar; they must not overlap each other.
          for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
              const [a, ra] = blocks[i]!;
              const [b, rb] = blocks[j]!;
              expect(
                overlaps(ra, rb),
                `${type}/${size} ${JSON.stringify(flags)}: ${a} × ${b}`,
              ).toBe(false);
            }
          }
          // The visual always gets a real share of the card.
          expect(layout.visual.h).toBeGreaterThanOrEqual(layout.safe.h * 0.3);
          expect(layout.visual.w).toBeGreaterThanOrEqual(layout.safe.w * 0.35);
          // Pins only on map cards, never more than asked for.
          if (type !== "map") expect(layout.pinRows).toBe(0);
          expect(layout.pinRows).toBeLessThanOrEqual(Math.min(flags.pins, 6));
          if (flags.caption) expect(layout.captionLines).toBeGreaterThan(0);
        }
      }
    },
  );

  it("fits at least three trip pins on every map card", () => {
    for (const size of CARD_SIZE_KEYS) {
      const layout = cardLayout("map", size, {
        caption: true,
        photo: true,
        home: true,
        pins: 6,
        visualAspect: 600 / 760,
      });
      expect(layout.pinRows, size).toBeGreaterThanOrEqual(3);
    }
  });

  it("puts the text left of the visual on the link card", () => {
    const layout = cardLayout("map", "link", {
      caption: true,
      photo: false,
      home: false,
      pins: 2,
      visualAspect: 0.8,
    });
    expect(layout.title.x + layout.title.w).toBeLessThanOrEqual(layout.visual.x);
    expect(layout.visual.h).toBe(layout.safe.h);
  });

  it("scales font sizes with the card", () => {
    const square = cardLayout("map", "square", {
      caption: false,
      photo: false,
      home: false,
      pins: 0,
      visualAspect: 1,
    });
    const link = cardLayout("map", "link", {
      caption: false,
      photo: false,
      home: false,
      pins: 0,
      visualAspect: 1,
    });
    expect(square.fonts.title).toBeGreaterThan(link.fonts.title);
    for (const px of Object.values(square.fonts)) expect(px).toBeGreaterThanOrEqual(20);
  });

  it("renders every type × theme × size without overlap in a 360 px wide preview", () => {
    for (const type of CARD_TYPES) {
      for (const theme of CARD_THEMES) {
        for (const size of CARD_SIZE_KEYS) {
          const input = baseInput({
            type,
            theme: theme.key,
            size,
            caption: "Tea gardens, rivers and the longest beach",
            hometown: "sylhet",
            pins: [
              { region: "sylhet", date: "2026-03-12", note: "Ratargul" },
              { region: "coxs-bazar", date: "", note: "" },
            ],
            text: { ...baseInput().text, home: "Home: Sylhet" },
          });
          const layout = layoutFor(input, geo);
          const k = 360 / layout.size.w;
          const blocks = Object.entries(layoutBlocks(layout)).map(
            ([n, r]) => [n, scaleRect(r, k)] as const,
          );
          const card: Rect = { x: 0, y: 0, w: 360, h: layout.size.h * k };
          for (const [, r] of blocks) expect(contains(card, r)).toBe(true);
          for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
              expect(overlaps(blocks[i]![1], blocks[j]![1]), `${type}/${theme.key}/${size}`).toBe(
                false,
              );
            }
          }
          // The visual stays big enough to read in the preview.
          expect(blocks.find(([n]) => n === "visual")![1].h).toBeGreaterThan(60);
        }
      }
    }
  });
});

describe("visual helpers", () => {
  it("fits boxes inside (contain) and over (cover) a rect, centred", () => {
    const rect = { x: 10, y: 20, w: 200, h: 100 };
    const c = fitContain(600, 760, rect);
    expect(c.h).toBeCloseTo(100);
    expect(c.x + c.w / 2).toBeCloseTo(110);
    expect(contains(rect, c)).toBe(true);
    const v = fitCover(640, 427, rect);
    expect(v.w).toBeGreaterThanOrEqual(200 - 1e-9);
    expect(v.h).toBeGreaterThanOrEqual(100 - 1e-9);
  });

  it("zooms around the hometown, shaped like the target, inside the map", () => {
    const full = { x: 0, y: 0, w: 600, h: 760 };
    const focus = { x: 500, y: 600, w: 30, h: 40 };
    const view = zoomViewport(full, focus, 1.5);
    expect(view.w / view.h).toBeCloseTo(1.5, 5);
    expect(view.w).toBeLessThan(full.w);
    expect(contains(full, view)).toBe(true);
    expect(contains(view, focus)).toBe(true);
  });

  it("lays out the level card: badge, title, bar and next line in order", () => {
    const l = levelLayout({ x: 0, y: 0, w: 900, h: 700 }, 10.8);
    expect(l.badge.y + l.badge.h).toBeLessThanOrEqual(l.levelTitle.y);
    expect(l.levelTitle.y + l.levelTitle.h).toBeLessThanOrEqual(l.bar.y);
    expect(l.bar.y + l.bar.h).toBeLessThanOrEqual(l.next.y);
    expect(l.next.y + l.next.h).toBeLessThanOrEqual(700);
  });

  it("grids stamps with the biggest cells that fit, and counts the rest", () => {
    const rect = { x: 0, y: 0, w: 900, h: 500 };
    for (const n of [1, 5, 13, 40, 64]) {
      const grid = stampGrid(n, rect, 50);
      expect(grid.shown + grid.more).toBe(n);
      expect(grid.cols * grid.rows).toBeGreaterThanOrEqual(grid.shown);
      for (let i = 0; i < grid.shown; i++) expect(contains(rect, stampCell(grid, i))).toBe(true);
    }
    const tight = stampGrid(64, { x: 0, y: 0, w: 200, h: 200 }, 50);
    expect(tight.shown).toBe(15);
    expect(tight.more).toBe(49);
    expect(contains({ x: 0, y: 0, w: 200, h: 200 }, stampCell(tight, tight.shown))).toBe(true);
    expect(stampGrid(0, rect, 50)).toMatchObject({ shown: 0, more: 0 });
  });

  it("zooms the map view to the hometown only when asked", () => {
    const rect = { x: 0, y: 0, w: 900, h: 600 };
    const plain = mapView(baseInput({ hometown: "sylhet" }), geo, rect);
    expect(plain.zoomed).toBe(false);
    const zoomed = mapView(
      baseInput({
        hometown: "sylhet",
        options: { colouredDistricts: false, districtPhotos: false, zoomHometown: true },
      }),
      geo,
      rect,
    );
    expect(zoomed.zoomed).toBe(true);
    expect(zoomed.view.w).toBeLessThan(plain.view.w);
    const sylhet = geo.regions.find((r) => r.key === "sylhet")!;
    expect(contains(zoomed.view, sylhet.bounds)).toBe(true);
  });

  it("uses the map's shape for the landscape split", () => {
    expect(visualAspect(baseInput(), geo)).toBeCloseTo(geo.bounds.w / geo.bounds.h);
    expect(visualAspect(baseInput({ type: "level" }), geo)).toBeLessThan(1);
  });
});
