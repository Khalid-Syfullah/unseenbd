/**
 * The share-card renderer: draws a Map, Level or Passport card onto a canvas. No React; the
 * card maker UI and the video exports both call `renderCard`.
 *
 * Fonts must be loaded first (`ensureCardFonts`), and images passed in `assets`.
 */
import { formatDate } from "@/lib/format";
import { fillCount, FOCAL, project } from "./animate";
import { sourceSize } from "./assets";
import type { CardGeo, Region } from "./geo";
import {
  CARD_SIZES,
  cardLayout,
  fitContain,
  fitCover,
  levelLayout,
  stampCell,
  stampGrid,
  zoomViewport,
  type CardLayout,
  type Fit,
  type Rect,
} from "./layout";
import { cardTheme, DIVISION_COLOURS, isDarkTheme, withAlpha, type CardTheme } from "./themes";
import { ellipsize, fitFontSize, wrapLines } from "./text";
import {
  STATIC_FRAME,
  type CardAssets,
  type CardFonts,
  type CardFrame,
  type CardInput,
  type LabelSize,
} from "./types";

type G = CanvasRenderingContext2D;

export type RenderEnv = {
  /** Map geometry (needed for map cards; level and passport cards draw without it). */
  geo: CardGeo | null;
  fonts: CardFonts;
  assets: CardAssets;
};

/** Offscreen canvases kept between frames of a video. */
export type RenderCache = {
  front?: HTMLCanvasElement;
  back?: HTMLCanvasElement;
  /** What `front` holds (so a frame with the same fill is not redrawn). */
  frontKey?: string;
  backKey?: string;
};

/** Colours for continents on a "coloured" world card. */
const CONTINENT_COLOURS: Readonly<Record<string, string>> = {
  Asia: "#D2584A",
  Europe: "#5B7DBE",
  Africa: "#D9824B",
  "North America": "#3FA37F",
  "South America": "#9A7CC0",
  Oceania: "#3E98C0",
};

const LABEL_UNITS: Record<Exclude<LabelSize, "hidden">, number> = {
  small: 1.9,
  medium: 2.5,
  large: 3.2,
};

/** Width ÷ height of what the visual shows, for the landscape split. */
export function visualAspect(input: CardInput, geo: CardGeo | null): number {
  if (input.type === "level") return 0.85;
  if (input.type === "passport") return 1;
  if (!geo) return input.map === "world" ? 2 : 0.8;
  return geo.bounds.w / Math.max(1, geo.bounds.h);
}

/** The layout for an input (shared by the renderer and the tests). */
export function layoutFor(input: CardInput, geo: CardGeo | null): CardLayout {
  return cardLayout(input.type, input.size, {
    caption: input.caption.trim() !== "",
    photo: input.photo !== null,
    home: input.text.home.trim() !== "",
    pins: input.type === "map" ? input.pins.length : 0,
    visualAspect: visualAspect(input, geo),
  });
}

function font(weight: number, px: number, family: string): string {
  return `${weight} ${Math.max(1, Math.round(px))}px ${family}`;
}

/** Draws one line in `rect`, shrinking from `px` to `minPx` and then cutting with "…". */
function drawFitted(
  g: G,
  text: string,
  rect: Rect,
  opts: {
    weight: number;
    px: number;
    minPx?: number;
    family: string;
    color: string;
    align?: CanvasTextAlign;
  },
): number {
  if (!text || rect.w <= 0) return 0;
  const min = opts.minPx ?? opts.px * 0.62;
  const size = fitFontSize(text, rect.w, opts.px, min, (t, s) => {
    g.font = font(opts.weight, s, opts.family);
    return g.measureText(t).width;
  });
  g.font = font(opts.weight, size, opts.family);
  const line = ellipsize(text, rect.w, (t) => g.measureText(t).width);
  g.fillStyle = opts.color;
  g.textAlign = opts.align ?? "left";
  g.textBaseline = "middle";
  const x =
    opts.align === "center"
      ? rect.x + rect.w / 2
      : opts.align === "right"
        ? rect.x + rect.w
        : rect.x;
  g.fillText(line, x, rect.y + rect.h / 2);
  return g.measureText(line).width;
}

function roundRect(g: G, r: Rect, radius: number) {
  const rad = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  g.beginPath();
  g.moveTo(r.x + rad, r.y);
  g.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  g.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  g.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  g.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  g.closePath();
}

/* -- background, wordmark, text blocks --------------------------------------------------------- */

const patternCache = new Map<string, HTMLCanvasElement>();

function jamdaniTile(theme: CardTheme, cell: number): HTMLCanvasElement {
  const key = `${theme.key}:${cell}`;
  const cached = patternCache.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = cell;
  c.height = cell;
  const g = c.getContext("2d")!;
  const m = cell / 40;
  g.fillStyle = withAlpha(theme.visited, 0.08);
  g.beginPath();
  g.moveTo(20 * m, 6 * m);
  g.lineTo(26 * m, 20 * m);
  g.lineTo(20 * m, 34 * m);
  g.lineTo(14 * m, 20 * m);
  g.closePath();
  g.fill();
  g.fillStyle = withAlpha(theme.accent, 0.18);
  for (const [x, y] of [
    [0, 0],
    [cell, 0],
    [0, cell],
    [cell, cell],
  ] as const) {
    g.beginPath();
    g.arc(x, y, 3 * m, 0, Math.PI * 2);
    g.fill();
  }
  patternCache.set(key, c);
  return c;
}

function drawBackground(g: G, layout: CardLayout, theme: CardTheme) {
  const { w, h } = layout.size;
  const u = layout.unit;
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, theme.bg[0]);
  grad.addColorStop(1, theme.bg[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // A soft glow in the accent colour, top right.
  const glow = g.createRadialGradient(
    w * 0.92,
    h * 0.06,
    0,
    w * 0.92,
    h * 0.06,
    Math.max(w, h) * 0.55,
  );
  glow.addColorStop(0, withAlpha(theme.accent, isDarkTheme(theme) ? 0.22 : 0.16));
  glow.addColorStop(1, withAlpha(theme.accent, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);

  if (theme.pattern) {
    const tile = jamdaniTile(theme, Math.max(16, Math.round(u * 6.5)));
    const pattern = g.createPattern(tile, "repeat");
    if (pattern) {
      g.fillStyle = pattern;
      g.fillRect(0, 0, w, h);
    }
  }
}

function drawWordmark(g: G, layout: CardLayout, theme: CardTheme, env: RenderEnv) {
  const r = layout.header;
  const logo = env.assets.logo;
  let x = r.x;
  if (logo) {
    const side = r.h;
    g.drawImage(logo, x, r.y, side, side);
    x += side + layout.unit * 1.6;
  }
  const px = layout.fonts.wordmark;
  g.font = font(400, px, env.fonts.display);
  g.textBaseline = "middle";
  g.textAlign = "left";
  const cy = r.y + r.h / 2;
  g.fillStyle = theme.text;
  g.fillText("Unseen ", x, cy);
  const w = g.measureText("Unseen ").width;
  g.fillStyle = isDarkTheme(theme) ? theme.accent : "#E2483A";
  g.fillText("BD", x + w, cy);
}

function drawHero(g: G, layout: CardLayout, theme: CardTheme, input: CardInput, env: RenderEnv) {
  const f = layout.fonts;
  drawFitted(g, input.text.title, layout.title, {
    weight: 700,
    px: f.title,
    family: env.fonts.ui,
    color: theme.text,
  });
  const countW = drawFitted(g, input.text.count, layout.count, {
    weight: 400,
    px: f.count,
    minPx: f.count * 0.5,
    family: env.fonts.display,
    color: theme.visited,
  });
  // Beside a short number ("3"), the label moves in next to it instead of leaving a gap.
  const beside = layout.countLabel.x > layout.count.x;
  const shift = beside
    ? Math.max(0, layout.countLabel.x - (layout.count.x + countW + layout.unit * 3))
    : 0;
  const slide = (r: Rect): Rect => ({ ...r, x: r.x - shift, w: r.w + shift });
  drawFitted(g, input.text.countLabel, slide(layout.countLabel), {
    weight: 600,
    px: f.label,
    family: env.fonts.ui,
    color: withAlpha(theme.text, 0.82),
  });
  if (layout.home) {
    drawFitted(g, input.text.home, slide(layout.home), {
      weight: 600,
      px: f.label,
      family: env.fonts.ui,
      color: withAlpha(theme.text, 0.82),
    });
  }
  if (layout.avatar && input.photo) {
    const a = layout.avatar;
    const { w, h } = sourceSize(input.photo);
    g.save();
    g.beginPath();
    g.arc(a.x + a.w / 2, a.y + a.h / 2, a.w / 2, 0, Math.PI * 2);
    g.closePath();
    g.clip();
    if (w && h) {
      const fit = fitCover(w, h, a);
      g.drawImage(input.photo, fit.x, fit.y, fit.w, fit.h);
    }
    g.restore();
    g.strokeStyle = theme.visited;
    g.lineWidth = Math.max(2, layout.unit * 0.6);
    g.beginPath();
    g.arc(a.x + a.w / 2, a.y + a.h / 2, a.w / 2 - g.lineWidth / 2, 0, Math.PI * 2);
    g.stroke();
  }
}

function drawCaption(g: G, layout: CardLayout, theme: CardTheme, input: CardInput, env: RenderEnv) {
  const r = layout.caption;
  if (!r || !layout.captionLines) return;
  const px = layout.fonts.caption;
  g.font = font(400, px, env.fonts.ui);
  const lines = wrapLines(
    `“${input.caption.trim()}”`,
    r.w,
    layout.captionLines,
    (t) => g.measureText(t).width,
  );
  const lineH = r.h / layout.captionLines;
  g.fillStyle = withAlpha(theme.text, 0.9);
  g.textAlign = "left";
  g.textBaseline = "middle";
  lines.forEach((line, i) => g.fillText(line, r.x, r.y + lineH * i + lineH / 2));
}

function drawPinList(g: G, layout: CardLayout, theme: CardTheme, input: CardInput, env: RenderEnv) {
  const r = layout.pins;
  if (!r || !layout.pinRows) return;
  const rowH = r.h / layout.pinRows;
  const px = layout.fonts.pin;
  const badge = rowH * 0.78;
  input.pins.slice(0, layout.pinRows).forEach((pin, i) => {
    const cy = r.y + rowH * i + rowH / 2;
    g.fillStyle = theme.text;
    g.beginPath();
    g.arc(r.x + badge / 2, cy, badge / 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.bg[0];
    g.font = font(700, badge * 0.55, env.fonts.ui);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(pinNumber(i + 1, input.lang), r.x + badge / 2, cy + badge * 0.03);
    const name = input.text.regionNames[pin.region] ?? pin.region;
    const date = pin.date ? formatDate(pin.date, input.lang) : "";
    const head = [name, date].filter(Boolean).join(" · ");
    const textX = r.x + badge + layout.unit * 1.6;
    const maxW = r.x + r.w - textX;
    g.textAlign = "left";
    g.font = font(700, px, env.fonts.ui);
    const headLine = ellipsize(head, maxW, (t) => g.measureText(t).width);
    g.fillStyle = theme.text;
    g.fillText(headLine, textX, cy);
    const note = pin.note.trim();
    if (note) {
      const used = g.measureText(headLine).width;
      const noteX = textX + used + px * 0.6;
      const room = r.x + r.w - noteX;
      g.font = font(400, px, env.fonts.ui);
      if (room > px * 3) {
        g.fillStyle = withAlpha(theme.text, 0.78);
        g.fillText(
          ellipsize(`— ${note}`, room, (t) => g.measureText(t).width),
          noteX,
          cy,
        );
      }
    }
  });
}

function pinNumber(n: number, lang: string): string {
  return lang === "bn" ? String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!) : String(n);
}

function drawFooter(g: G, layout: CardLayout, theme: CardTheme, input: CardInput, env: RenderEnv) {
  drawFitted(g, input.url, layout.footer, {
    weight: 600,
    px: layout.fonts.footer,
    family: env.fonts.ui,
    color: withAlpha(theme.text, 0.7),
  });
}

/* -- map ---------------------------------------------------------------------------------------- */

const pathCache = new Map<string, Path2D>();

function regionPath(geo: CardGeo, region: Region): Path2D {
  const key = `${geo.kind}:${region.key}`;
  let p = pathCache.get(key);
  if (!p) {
    p = new Path2D(region.d);
    pathCache.set(key, p);
  }
  return p;
}

function outlinePath(geo: CardGeo, i: number, d: string): Path2D {
  const key = `${geo.kind}:outline:${i}`;
  let p = pathCache.get(key);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(key, p);
  }
  return p;
}

function allPath(geo: CardGeo): Path2D {
  const key = `${geo.kind}:all`;
  let p = pathCache.get(key);
  if (!p) {
    p = new Path2D(geo.regions.map((r) => r.d).join(" "));
    pathCache.set(key, p);
  }
  return p;
}

/** The part of the map shown and how it maps into `rect`. */
export function mapView(
  input: CardInput,
  geo: CardGeo,
  rect: Rect,
): { view: Rect; fit: Fit; zoomed: boolean } {
  const b = geo.bounds;
  const pad = Math.max(b.w, b.h) * 0.02;
  const full: Rect = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  const home = input.hometown ? geo.regions.find((r) => r.key === input.hometown) : undefined;
  const zoomed = Boolean(input.options.zoomHometown && home && input.map === "bangladesh");
  const view =
    zoomed && home ? zoomViewport(full, home.bounds, rect.w / Math.max(1, rect.h)) : full;
  return { view, fit: fitContain(view.w, view.h, rect), zoomed };
}

function drawMap(
  g: G,
  rect: Rect,
  layout: CardLayout,
  theme: CardTheme,
  input: CardInput,
  env: RenderEnv,
  fill: number,
) {
  const geo = env.geo;
  if (!geo || rect.w <= 0 || rect.h <= 0) return;
  const u = layout.unit;
  const { view, fit, zoomed } = mapView(input, geo, rect);
  const s = fit.scale;
  const toPx = (x: number, y: number) => ({
    x: fit.x + (x - view.x) * s,
    y: fit.y + (y - view.y) * s,
  });
  const byKey = new Map(geo.regions.map((r) => [r.key, r]));

  g.save();
  if (zoomed) {
    roundRect(g, rect, u * 3);
    g.fillStyle = withAlpha(theme.text, 0.05);
    g.fill();
    g.clip();
  }
  g.translate(fit.x, fit.y);
  g.scale(s, s);
  g.translate(-view.x, -view.y);

  // Land with a soft shadow.
  g.save();
  g.shadowColor = isDarkTheme(theme) ? "rgba(0,0,0,0.35)" : "rgba(16,23,46,0.18)";
  g.shadowBlur = u * 2.4;
  g.shadowOffsetY = u * 0.8;
  g.fillStyle = theme.land;
  g.fill(allPath(geo));
  g.restore();

  // Visited (and wished-for) regions, in order, up to the fill level.
  const visited = input.visitedIds.filter((k) => byKey.has(k));
  const { whole, partial } = fillCount(fill, visited.length);
  const covers = input.options.districtPhotos ? env.assets.covers : undefined;
  const colourOf = (r: Region) =>
    input.options.colouredDistricts
      ? ((input.map === "world" ? CONTINENT_COLOURS[r.group] : DIVISION_COLOURS[r.group]) ??
        theme.visited)
      : theme.visited;

  if (input.wishIds?.length) {
    g.fillStyle = withAlpha(theme.accent, 0.75);
    for (const key of input.wishIds) {
      const r = byKey.get(key);
      if (r && !input.visitedIds.includes(key)) g.fill(regionPath(geo, r));
    }
  }

  const drawn = visited.slice(0, whole + (partial > 0 ? 1 : 0));
  drawn.forEach((key, i) => {
    const r = byKey.get(key)!;
    const path = regionPath(geo, r);
    g.save();
    g.globalAlpha = i < whole ? 1 : partial;
    const cover = covers?.get(key);
    const size = cover ? sourceSize(cover) : null;
    if (cover && size?.w && size.h) {
      g.clip(path);
      const c = fitCover(size.w, size.h, r.bounds);
      g.drawImage(cover, c.x, c.y, c.w, c.h);
      // A light wash of the theme colour ties the photos together.
      g.fillStyle = withAlpha(theme.visited, 0.12);
      g.fill(path);
    } else {
      g.fillStyle = colourOf(r);
      g.fill(path);
    }
    g.restore();
  });

  // Borders.
  g.strokeStyle = theme.border;
  g.lineJoin = "round";
  g.lineWidth = Math.max(0.8, u * (input.map === "world" ? 0.1 : 0.16)) / s;
  g.stroke(allPath(geo));
  if (geo.outlines.length) {
    g.strokeStyle = withAlpha(theme.text, 0.32);
    g.lineWidth = Math.max(1, u * 0.28) / s;
    geo.outlines.forEach((d, i) => g.stroke(outlinePath(geo, i, d)));
  }
  g.restore();

  // Labels, hometown marker and pins are drawn in card pixels so they keep their size. Markers
  // are placed first; labels then skip any spot a marker (or another label) already holds.
  const home = input.hometown ? byKey.get(input.hometown) : undefined;
  const houseR = u * 1.7;
  const taken: Rect[] = [];
  let homeAt: { x: number; y: number } | null = null;
  if (home) {
    const p = toPx(home.anchor.x, home.anchor.y);
    if (inside(rect, p)) {
      homeAt = p;
      taken.push({ x: p.x - houseR, y: p.y - houseR, w: houseR * 2, h: houseR * 2 });
    }
  }
  const pinMarks: { x: number; y: number; r: number; label: string }[] = [];
  if (input.type === "map" && layout.pinRows) {
    const radius = u * 2.1;
    input.pins.slice(0, layout.pinRows).forEach((pin, i) => {
      const r = byKey.get(pin.region);
      if (!r) return;
      const same = input.pins.slice(0, i).filter((q) => q.region === pin.region).length;
      const p = toPx(r.anchor.x, r.anchor.y);
      // The pin's tip touches the district's centre, or sits on top of the hometown house.
      const lift = pin.region === home?.key && homeAt ? houseR * 1.1 : 0;
      const x = p.x + same * radius * 2.2;
      const y = p.y - radius * 1.75 - lift;
      if (!inside(rect, { x, y })) return;
      pinMarks.push({ x, y, r: radius, label: pinNumber(i + 1, input.lang) });
      taken.push({ x: x - radius, y: y - radius, w: radius * 2, h: radius * 2.8 });
    });
  }
  if (input.labelSize !== "hidden") {
    const px = u * LABEL_UNITS[input.labelSize];
    const keys = [...(home ? [home.key] : []), ...drawn.filter((k) => k !== home?.key)];
    drawLabels(
      g,
      keys.map((k) => byKey.get(k)!),
      rect,
      px,
      theme,
      input,
      env,
      toPx,
      home?.key,
      taken,
      houseR,
    );
  }
  if (homeAt) drawHomeMarker(g, homeAt.x, homeAt.y, houseR, theme, u);
  for (const m of pinMarks) drawPinMarker(g, m.x, m.y, m.r, m.label, theme, env);
}

function inside(r: Rect, p: { x: number; y: number }): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function drawLabels(
  g: G,
  regions: Region[],
  rect: Rect,
  px: number,
  theme: CardTheme,
  input: CardInput,
  env: RenderEnv,
  toPx: (x: number, y: number) => { x: number; y: number },
  homeKey: string | undefined,
  taken: Rect[],
  houseR: number,
) {
  const placed: Rect[] = [...taken];
  // Big regions first, so a crowded corner keeps its biggest names.
  const order = [...regions].sort((a, b) =>
    a.key === homeKey ? -1 : b.key === homeKey ? 1 : b.area - a.area,
  );
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  for (const r of order) {
    const name = input.text.regionNames[r.key] ?? (input.lang === "bn" ? r.nameBn : r.nameEn);
    if (!name) continue;
    const weight = r.key === homeKey ? 700 : 600;
    g.font = font(weight, px, env.fonts.ui);
    const w = g.measureText(name).width;
    const p = toPx(r.anchor.x, r.anchor.y);
    const y = r.key === homeKey ? p.y + houseR + px * 0.85 : p.y;
    const box: Rect = { x: p.x - w / 2 - px * 0.2, y: y - px * 0.75, w: w + px * 0.4, h: px * 1.5 };
    if (
      box.x < rect.x ||
      box.y < rect.y ||
      box.x + box.w > rect.x + rect.w ||
      box.y + box.h > rect.y + rect.h
    )
      continue;
    if (
      placed.some(
        (q) => box.x < q.x + q.w && q.x < box.x + box.w && box.y < q.y + q.h && q.y < box.y + box.h,
      )
    )
      continue;
    placed.push(box);
    g.strokeStyle = withAlpha(theme.bg[0], 0.9);
    g.lineWidth = px * 0.32;
    g.strokeText(name, p.x, y);
    g.fillStyle = theme.text;
    g.fillText(name, p.x, y);
  }
}

/** The hometown: a disc in the accent colour with a small house in it. */
function drawHomeMarker(g: G, x: number, y: number, r: number, theme: CardTheme, u: number) {
  g.save();
  g.fillStyle = theme.accent;
  g.strokeStyle = theme.bg[0];
  g.lineWidth = u * 0.45;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.fill();
  const h = r * 0.55;
  g.fillStyle = theme.bg[0];
  g.beginPath();
  g.moveTo(x, y - h);
  g.lineTo(x + h, y - h * 0.05);
  g.lineTo(x + h * 0.7, y - h * 0.05);
  g.lineTo(x + h * 0.7, y + h * 0.8);
  g.lineTo(x - h * 0.7, y + h * 0.8);
  g.lineTo(x - h * 0.7, y - h * 0.05);
  g.lineTo(x - h, y - h * 0.05);
  g.closePath();
  g.fill();
  g.restore();
}

function drawPinMarker(
  g: G,
  x: number,
  y: number,
  r: number,
  label: string,
  theme: CardTheme,
  env: RenderEnv,
) {
  g.save();
  g.fillStyle = theme.text;
  g.strokeStyle = theme.bg[0];
  g.lineWidth = r * 0.22;
  g.beginPath();
  g.moveTo(x, y + r * 1.75);
  g.arc(x, y, r, Math.PI * 0.62, Math.PI * 2.38);
  g.closePath();
  g.stroke();
  g.fill();
  g.fillStyle = theme.bg[0];
  g.font = font(700, r * 1.15, env.fonts.ui);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, x, y + r * 0.04);
  g.restore();
}

/* -- level and passport ------------------------------------------------------------------------ */

function drawLevel(
  g: G,
  rect: Rect,
  layout: CardLayout,
  theme: CardTheme,
  input: CardInput,
  env: RenderEnv,
  fill: number,
) {
  const u = layout.unit;
  const l = levelLayout(rect, u);
  const badge = env.assets.badge;
  if (badge && l.badge.w > 0) {
    g.save();
    if (input.levelReached === false) g.globalAlpha = 0.45;
    g.drawImage(badge, l.badge.x, l.badge.y, l.badge.w, l.badge.h);
    g.restore();
  } else if (l.badge.w > 0) {
    g.strokeStyle = withAlpha(theme.text, 0.3);
    g.setLineDash([u, u]);
    g.lineWidth = u * 0.5;
    g.beginPath();
    g.arc(
      l.badge.x + l.badge.w / 2,
      l.badge.y + l.badge.h / 2,
      Math.min(l.badge.w, l.badge.h) / 2.4,
      0,
      Math.PI * 2,
    );
    g.stroke();
    g.setLineDash([]);
  }
  drawFitted(g, input.text.levelTitle, l.levelTitle, {
    weight: 700,
    px: l.titleFont,
    family: env.fonts.ui,
    color: theme.text,
    align: "center",
  });
  roundRect(g, l.bar, l.bar.h / 2);
  g.fillStyle = withAlpha(theme.text, 0.14);
  g.fill();
  const p = Math.min(1, Math.max(0, input.progress)) * Math.min(1, Math.max(0, fill));
  if (p > 0) {
    roundRect(g, { ...l.bar, w: Math.max(l.bar.h, l.bar.w * p) }, l.bar.h / 2);
    g.fillStyle = theme.visited;
    g.fill();
  }
  drawFitted(g, input.text.levelNext, l.next, {
    weight: 600,
    px: l.nextFont,
    family: env.fonts.ui,
    color: withAlpha(theme.text, 0.8),
    align: "center",
  });
}

function drawPassport(
  g: G,
  rect: Rect,
  layout: CardLayout,
  theme: CardTheme,
  input: CardInput,
  env: RenderEnv,
  fill: number,
) {
  const u = layout.unit;
  const notePx = Math.round(u * 2.6);
  const noteH = Math.round(notePx * 1.5);
  const note: Rect = { x: rect.x, y: rect.y + rect.h - noteH, w: rect.w, h: noteH };
  const area: Rect = { x: rect.x, y: rect.y, w: rect.w, h: Math.max(0, rect.h - noteH - u * 1.5) };
  const keys = input.visitedIds;
  const grid = stampGrid(keys.length, area, u * 6);
  const { whole, partial } = fillCount(fill, grid.shown);
  if (!keys.length) {
    const side = Math.min(area.w, area.h) * 0.6;
    const cx = area.x + area.w / 2;
    const cy = area.y + area.h / 2;
    g.strokeStyle = withAlpha(theme.text, 0.3);
    g.lineWidth = u * 0.5;
    g.setLineDash([u * 1.2, u * 1.2]);
    g.beginPath();
    g.arc(cx, cy, side / 2, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    drawFitted(
      g,
      input.text.passportEmpty,
      { x: cx - side * 0.42, y: cy - u * 3, w: side * 0.84, h: u * 6 },
      {
        weight: 600,
        px: u * 3.4,
        family: env.fonts.ui,
        color: withAlpha(theme.text, 0.7),
        align: "center",
      },
    );
  }
  for (let i = 0; i < whole + (partial > 0 ? 1 : 0) && i < grid.shown; i++) {
    const cell = stampCell(grid, i);
    const img = env.assets.stamps?.get(keys[i]!);
    const k = i < whole ? 1 : partial;
    // The newest stamp lands with a little bounce.
    const scale = 0.9 * (i < whole ? 1 : 1.35 - 0.35 * k);
    const side = cell.w * scale;
    const x = cell.x + (cell.w - side) / 2;
    const y = cell.y + (cell.h - side) / 2;
    g.save();
    g.globalAlpha = k;
    if (img) {
      // Stamps are dark ink; on dark themes they sit on a paper disc.
      if (isDarkTheme(theme)) {
        g.fillStyle = withAlpha("#FBF6EC", 0.92);
        g.beginPath();
        g.arc(cell.x + cell.w / 2, cell.y + cell.h / 2, side * 0.49, 0, Math.PI * 2);
        g.fill();
      }
      g.drawImage(img, x, y, side, side);
    } else {
      g.strokeStyle = theme.visited;
      g.lineWidth = Math.max(1, side * 0.04);
      g.beginPath();
      g.arc(cell.x + cell.w / 2, cell.y + cell.h / 2, side * 0.45, 0, Math.PI * 2);
      g.stroke();
      const name = input.text.regionNames[keys[i]!] ?? keys[i]!;
      drawFitted(
        g,
        name,
        { x: x + side * 0.15, y: y + side * 0.35, w: side * 0.7, h: side * 0.3 },
        {
          weight: 700,
          px: side * 0.16,
          family: env.fonts.ui,
          color: theme.visited,
          align: "center",
        },
      );
    }
    g.restore();
  }
  if (grid.more > 0 && fill >= 1) {
    const cell = stampCell(grid, grid.shown);
    const side = cell.w * 0.82;
    g.fillStyle = withAlpha(theme.visited, 0.16);
    g.beginPath();
    g.arc(cell.x + cell.w / 2, cell.y + cell.h / 2, side / 2, 0, Math.PI * 2);
    g.fill();
    drawFitted(
      g,
      input.text.passportMore.replace("{count}", pinNumber(grid.more, input.lang)),
      {
        x: cell.x + cell.w * 0.12,
        y: cell.y + cell.h * 0.3,
        w: cell.w * 0.76,
        h: cell.h * 0.4,
      },
      { weight: 700, px: side * 0.3, family: env.fonts.ui, color: theme.visited, align: "center" },
    );
  }
  drawFitted(g, input.text.passportNote, note, {
    weight: 400,
    px: notePx,
    family: env.fonts.ui,
    color: withAlpha(theme.text, 0.7),
    align: "center",
  });
}

function drawVisual(
  g: G,
  rect: Rect,
  layout: CardLayout,
  theme: CardTheme,
  input: CardInput,
  env: RenderEnv,
  fill: number,
) {
  if (input.type === "level") drawLevel(g, rect, layout, theme, input, env, fill);
  else if (input.type === "passport") drawPassport(g, rect, layout, theme, input, env, fill);
  else drawMap(g, rect, layout, theme, input, env, fill);
}

/* -- 3D projection ------------------------------------------------------------------------------ */

function offscreen(
  cache: RenderCache,
  which: "front" | "back",
  w: number,
  h: number,
): HTMLCanvasElement {
  let c = cache[which];
  if (!c) {
    c = document.createElement("canvas");
    cache[which] = c;
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

/**
 * Draws `src` (the size of `rect`) leaning back by `angle` around its bottom edge, centred
 * vertically in `rect`. Rows further back get narrower, so it reads as a 3D tilt.
 */
function projectTilt(g: G, src: HTMLCanvasElement, rect: Rect, angle: number) {
  const H = src.height;
  const W = src.width;
  const f = FOCAL * Math.max(W, H);
  const cx = rect.x + rect.w / 2;
  const height = project(H, angle, f).pos;
  const baseY = rect.y + rect.h / 2 + height / 2;
  // Soft ground shadow under the base.
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.4);
  grad.addColorStop(0, `rgba(0,0,0,${0.2 * Math.sin(angle)})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.save();
  g.translate(cx, baseY);
  g.scale(1, 0.16);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, W * 0.4, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const step = 2;
  for (let y = 0; y < H; y += step) {
    const top = project(H - y, angle, f);
    const bottom = project(H - Math.min(H, y + step), angle, f);
    const y0 = baseY - top.pos;
    const y1 = baseY - bottom.pos;
    const w = W * ((top.scale + bottom.scale) / 2);
    g.drawImage(
      src,
      0,
      y,
      W,
      Math.min(step, H - y),
      cx - w / 2,
      y0,
      w,
      Math.max(0.5, y1 - y0) + 0.6,
    );
  }
}

/** Draws `front` turned by `angle` around the vertical axis (`back` when facing away). */
function projectSpin(
  g: G,
  front: HTMLCanvasElement,
  back: HTMLCanvasElement,
  rect: Rect,
  angle: number,
) {
  const W = front.width;
  const H = front.height;
  const f = FOCAL * Math.max(W, H);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const facing = Math.cos(angle) >= 0;
  const src = facing ? front : back;
  // Push the plane back by its half width while it turns, so the near edge never grows past
  // the flat card.
  const push = (W / 2) * Math.abs(Math.sin(angle));
  const step = 2;
  for (let x = 0; x < W; x += step) {
    const a = project(x - W / 2, angle, f, push);
    const b = project(Math.min(W, x + step) - W / 2, angle, f, push);
    const x0 = cx + Math.min(a.pos, b.pos);
    const x1 = cx + Math.max(a.pos, b.pos);
    const s = (a.scale + b.scale) / 2;
    const h = H * s;
    g.drawImage(
      src,
      x,
      0,
      Math.min(step, W - x),
      H,
      x0,
      cy - h / 2,
      Math.max(0.5, x1 - x0) + 0.6,
      h,
    );
  }
}

/* -- entry point -------------------------------------------------------------------------------- */

/**
 * Draws the card (or one frame of a video) onto `canvas`, resizing it to the export size.
 * `cache` keeps offscreen canvases between frames.
 */
export function renderCard(
  canvas: HTMLCanvasElement,
  input: CardInput,
  env: RenderEnv,
  frame: CardFrame = STATIC_FRAME,
  cache: RenderCache = {},
): CardLayout {
  const size = CARD_SIZES[input.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  const g = canvas.getContext("2d");
  const layout = layoutFor(input, env.geo);
  if (!g) return layout;
  const theme = cardTheme(input.theme);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, size.w, size.h);
  g.imageSmoothingQuality = "high";
  drawBackground(g, layout, theme);
  drawWordmark(g, layout, theme, env);
  drawHero(g, layout, theme, input, env);
  drawCaption(g, layout, theme, input, env);

  const v = layout.visual;
  if (frame.tilt === 0 && frame.spin === 0) {
    drawVisual(g, v, layout, theme, input, env, frame.fill);
  } else {
    const w = Math.max(1, Math.round(v.w));
    const h = Math.max(1, Math.round(v.h));
    const local: Rect = { x: 0, y: 0, w, h };
    const frontKey = `${input.type}:${input.size}:${frame.fill}`;
    const front = offscreen(cache, "front", w, h);
    if (cache.frontKey !== frontKey) {
      const fg = front.getContext("2d")!;
      fg.setTransform(1, 0, 0, 1, 0, 0);
      fg.clearRect(0, 0, w, h);
      drawVisual(fg, local, layout, theme, input, env, frame.fill);
      cache.frontKey = frontKey;
    }
    if (frame.spin !== 0) {
      const back = offscreen(cache, "back", w, h);
      if (cache.backKey !== frontKey) {
        const bg = back.getContext("2d")!;
        bg.setTransform(1, 0, 0, 1, 0, 0);
        bg.clearRect(0, 0, w, h);
        bg.globalCompositeOperation = "source-over";
        bg.drawImage(front, 0, 0);
        bg.globalCompositeOperation = "source-atop";
        bg.fillStyle = withAlpha(theme.bg[1], 0.55);
        bg.fillRect(0, 0, w, h);
        bg.globalCompositeOperation = "source-over";
        cache.backKey = frontKey;
      }
      projectSpin(g, front, back, v, frame.spin);
    } else {
      projectTilt(g, front, v, frame.tilt);
    }
  }

  drawPinList(g, layout, theme, input, env);
  drawFooter(g, layout, theme, input, env);
  g.restore();
  return layout;
}
