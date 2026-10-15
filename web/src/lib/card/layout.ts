/**
 * Layout maths for the share card: pixel sizes, safe areas and where each block goes. Pure, so
 * the tests can check every type × size × option combination for overlaps.
 *
 * Every measure is in card pixels and derives from one unit `u` (1 % of the card's short side),
 * so a card looks the same at any export size and in the 360 px preview.
 */
import type { CardSizeKey, CardType } from "./types";

export type Rect = { x: number; y: number; w: number; h: number };

export type CardSize = { key: CardSizeKey; w: number; h: number; ratio: string };

/** Export sizes: the usual pixel sizes for each platform. */
export const CARD_SIZES: Readonly<Record<CardSizeKey, CardSize>> = {
  link: { key: "link", w: 1200, h: 628, ratio: "1.91:1" },
  post: { key: "post", w: 1080, h: 1350, ratio: "4:5" },
  square: { key: "square", w: 1080, h: 1080, ratio: "1:1" },
  story: { key: "story", w: 1080, h: 1920, ratio: "9:16" },
};

/** 1 % of the short side. */
export function cardUnit(size: CardSize): number {
  return Math.min(size.w, size.h) / 100;
}

/**
 * The area that stays clear of edges and platform overlays: a 6u margin everywhere, and on
 * stories 11 % of the height at the top and 13 % at the bottom (profile bar, reply box).
 */
export function safeArea(size: CardSize): Rect {
  const m = Math.round(cardUnit(size) * 6);
  const top = size.key === "story" ? Math.max(m, Math.round(size.h * 0.11)) : m;
  const bottom = size.key === "story" ? Math.max(m, Math.round(size.h * 0.13)) : m;
  return { x: m, y: top, w: size.w - 2 * m, h: size.h - top - bottom };
}

/** Line height for UI text: generous, because Bengali has tall marks above and below. */
export const LINE = 1.42;

export type LayoutFlags = {
  /** There is a caption. */
  caption: boolean;
  /** There is a custom photo (drawn as a circle beside the title). */
  photo: boolean;
  /** There is a hometown line under the count. */
  home: boolean;
  /** Trip pins to list (map cards only; others ignore it). */
  pins: number;
  /** Width ÷ height of the visual (map 600/760, world 2, …), used for the landscape split. */
  visualAspect: number;
};

export type CardFontSizes = {
  wordmark: number;
  title: number;
  count: number;
  label: number;
  caption: number;
  pin: number;
  footer: number;
};

export type CardLayout = {
  size: CardSize;
  unit: number;
  safe: Rect;
  /** Wordmark row. */
  header: Rect;
  /** Title, number, label and home lines. */
  hero: Rect;
  title: Rect;
  count: Rect;
  countLabel: Rect;
  home: Rect | null;
  avatar: Rect | null;
  caption: Rect | null;
  captionLines: number;
  /** The map, badge or stamp grid. */
  visual: Rect;
  pins: Rect | null;
  /** How many pins fit (the rest are left off the card). */
  pinRows: number;
  /** URL line. */
  footer: Rect;
  fonts: CardFontSizes;
  gap: number;
};

/** Font sizes in px for a card size. */
export function fontSizes(size: CardSize): CardFontSizes {
  const u = cardUnit(size);
  const landscape = size.w > size.h;
  return {
    wordmark: Math.round(u * 4.4),
    title: Math.round(u * (landscape ? 5.6 : 5.4)),
    count: Math.round(u * (landscape ? 12 : 11)),
    label: Math.round(u * 3.3),
    caption: Math.round(u * 3.4),
    pin: Math.round(u * 3),
    footer: Math.round(u * 2.6),
  };
}

const MAX_CAPTION_LINES: Record<CardSizeKey, number> = { link: 2, post: 3, square: 2, story: 3 };

/** Rows of the trip-pin list at most. */
export const MAX_PIN_ROWS = 6;

/** The visual never gets less than this share of the safe height on portrait cards. */
const MIN_VISUAL_SHARE = 0.38;

export function rectBottom(r: Rect): number {
  return r.y + r.h;
}

export function rectRight(r: Rect): number {
  return r.x + r.w;
}

/** True when two rectangles share any area (touching edges do not count). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** True when `inner` lies within `outer` (with a 0.5 px tolerance for rounding). */
export function contains(outer: Rect, inner: Rect): boolean {
  const e = 0.5;
  return (
    inner.x >= outer.x - e &&
    inner.y >= outer.y - e &&
    inner.x + inner.w <= outer.x + outer.w + e &&
    inner.y + inner.h <= outer.y + outer.h + e
  );
}

/**
 * Title on top; below it the big number with its label (and the hometown line) to its right
 * when there is room, otherwise stacked under it. The photo circle sits at the right end.
 */
function heroBlock(
  x: number,
  y: number,
  w: number,
  fonts: CardFontSizes,
  u: number,
  flags: LayoutFlags,
) {
  const titleH = Math.round(fonts.title * 1.3);
  const countH = Math.round(fonts.count * 1.08);
  const labelH = Math.round(fonts.label * LINE);
  const homeH = flags.home ? labelH : 0;
  const inner = Math.round(u * 0.8);
  const avatarMax = flags.photo ? Math.round(Math.min(w * 0.26, u * 22)) : 0;
  const textW = flags.photo ? w - avatarMax - Math.round(u * 3) : w;
  const countW = Math.round(Math.min(textW * 0.48, u * 40));
  const sideGap = Math.round(u * 2.5);
  const sideW = textW - countW - sideGap;
  const side = sideW >= u * 28;
  const rowY = y + titleH + inner;
  let count: Rect;
  let countLabel: Rect;
  let home: Rect | null = null;
  let h: number;
  if (side) {
    const rowH = Math.max(countH, labelH + homeH);
    count = { x, y: rowY, w: countW, h: rowH };
    const labelY = rowY + (rowH - labelH - homeH) / 2;
    countLabel = { x: x + countW + sideGap, y: labelY, w: sideW, h: labelH };
    if (flags.home) home = { x: countLabel.x, y: labelY + labelH, w: sideW, h: homeH };
    h = titleH + inner + rowH;
  } else {
    count = { x, y: rowY, w: textW, h: countH };
    countLabel = { x, y: rowY + countH, w: textW, h: labelH };
    if (flags.home) home = { x, y: countLabel.y + labelH, w: textW, h: homeH };
    h = titleH + inner + countH + labelH + homeH;
  }
  const title: Rect = { x, y, w: textW, h: titleH };
  const avatarSide = Math.min(avatarMax, h);
  const avatar: Rect | null = flags.photo
    ? { x: x + w - avatarSide, y: y + (h - avatarSide) / 2, w: avatarSide, h: avatarSide }
    : null;
  return { hero: { x, y, w, h }, title, count, countLabel, home, avatar };
}

/**
 * Where every block of a card goes.
 *
 * - Portrait and square cards stack: wordmark, title block, caption, visual (takes the rest),
 *   trip pins, URL line.
 * - The 1.91:1 link card puts the text in a left column and the visual on the right.
 */
export function cardLayout(type: CardType, sizeKey: CardSizeKey, flags: LayoutFlags): CardLayout {
  const size = CARD_SIZES[sizeKey];
  const u = cardUnit(size);
  const safe = safeArea(size);
  const fonts = fontSizes(size);
  const gap = Math.round(u * 3);
  const pinsWanted =
    type === "map" ? Math.min(Math.max(0, Math.floor(flags.pins)), MAX_PIN_ROWS) : 0;
  const pinRowH = Math.round(fonts.pin * 1.55);
  const headerH = Math.round(fonts.wordmark * 1.35);
  const footerH = Math.round(fonts.footer * LINE);
  const captionLineH = Math.round(fonts.caption * LINE);
  const maxCaption = MAX_CAPTION_LINES[sizeKey];

  if (size.w > size.h) {
    // Landscape: text column on the left, visual on the right.
    const aspect = Math.max(0.3, flags.visualAspect);
    const visualW = Math.round(Math.min(safe.w * 0.58, Math.max(safe.w * 0.4, safe.h * aspect)));
    const colW = safe.w - visualW - gap;
    const visual: Rect = { x: safe.x + colW + gap, y: safe.y, w: visualW, h: safe.h };
    const header: Rect = { x: safe.x, y: safe.y, w: colW, h: headerH };
    const heroParts = heroBlock(safe.x, header.y + headerH + gap, colW, fonts, u, flags);
    const footer: Rect = { x: safe.x, y: rectBottom(safe) - footerH, w: colW, h: footerH };
    let y = rectBottom(heroParts.hero) + gap;
    let caption: Rect | null = null;
    let captionLines = 0;
    if (flags.caption) {
      const room = Math.floor((footer.y - gap - y) / captionLineH);
      captionLines = Math.max(0, Math.min(maxCaption, room));
      if (captionLines > 0) {
        caption = { x: safe.x, y, w: colW, h: captionLines * captionLineH };
        y += caption.h + gap;
      }
    }
    let pins: Rect | null = null;
    let pinRows = 0;
    if (pinsWanted) {
      pinRows = Math.max(0, Math.min(pinsWanted, Math.floor((footer.y - gap - y) / pinRowH)));
      if (pinRows) pins = { x: safe.x, y, w: colW, h: pinRows * pinRowH };
    }
    return {
      size,
      unit: u,
      safe,
      header,
      ...heroParts,
      caption,
      captionLines,
      visual,
      pins,
      pinRows,
      footer,
      fonts,
      gap,
    };
  }

  // Portrait / square: one column.
  const header: Rect = { x: safe.x, y: safe.y, w: safe.w, h: headerH };
  const heroParts = heroBlock(safe.x, header.y + headerH + gap, safe.w, fonts, u, flags);
  const footer: Rect = { x: safe.x, y: rectBottom(safe) - footerH, w: safe.w, h: footerH };
  const top = rectBottom(heroParts.hero) + gap;
  const minVisual = Math.round(safe.h * MIN_VISUAL_SHARE);
  // Space left for caption + visual + pins, with their gaps.
  let room = footer.y - gap - top;
  let captionLines = 0;
  if (flags.caption) {
    const fit = Math.floor((room - minVisual - gap) / captionLineH);
    captionLines = Math.max(0, Math.min(maxCaption, fit));
    if (captionLines) room -= captionLines * captionLineH + gap;
  }
  let y = top;
  let caption: Rect | null = null;
  if (captionLines) {
    caption = { x: safe.x, y, w: safe.w, h: captionLines * captionLineH };
    y += caption.h + gap;
  }
  room = Math.max(0, room);
  let visual: Rect = { x: safe.x, y, w: safe.w, h: room };
  let pins: Rect | null = null;
  let pinRows = 0;
  if (pinsWanted) {
    // Beside the map when the visual is much wider than the map needs (square and post cards),
    // otherwise under it.
    const mapW = Math.round(Math.min(safe.w * 0.62, room * flags.visualAspect * 1.1));
    const colW = safe.w - mapW - gap;
    const sideRows = Math.min(pinsWanted, Math.floor(room / pinRowH));
    if (colW >= u * 34 && sideRows >= Math.min(pinsWanted, 3)) {
      pinRows = sideRows;
      visual = { x: safe.x, y, w: mapW, h: room };
      const h = pinRows * pinRowH;
      pins = { x: safe.x + mapW + gap, y: y + (room - h) / 2, w: colW, h };
    } else {
      pinRows = Math.max(0, Math.min(pinsWanted, Math.floor((room - minVisual - gap) / pinRowH)));
      if (pinRows) {
        const h = pinRows * pinRowH;
        visual = { x: safe.x, y, w: safe.w, h: room - h - gap };
        pins = { x: safe.x, y: y + visual.h + gap, w: safe.w, h };
      }
    }
  }
  return {
    size,
    unit: u,
    safe,
    header,
    ...heroParts,
    caption,
    captionLines,
    visual,
    pins,
    pinRows,
    footer,
    fonts,
    gap,
  };
}

/** The named blocks of a layout that are drawn, for overlap checks. */
export function layoutBlocks(layout: CardLayout): Record<string, Rect> {
  const out: Record<string, Rect> = {
    header: layout.header,
    title: layout.title,
    count: layout.count,
    countLabel: layout.countLabel,
    visual: layout.visual,
    footer: layout.footer,
  };
  if (layout.home) out.home = layout.home;
  if (layout.avatar) out.avatar = layout.avatar;
  if (layout.caption) out.caption = layout.caption;
  if (layout.pins) out.pins = layout.pins;
  return out;
}

/* -- inside the visual ------------------------------------------------------------------------ */

export type Fit = { x: number; y: number; w: number; h: number; scale: number };

/** Scales a `w × h` box to fit inside `rect`, centred (CSS `object-fit: contain`). */
export function fitContain(w: number, h: number, rect: Rect): Fit {
  const scale = w > 0 && h > 0 ? Math.min(rect.w / w, rect.h / h) : 0;
  const fw = w * scale;
  const fh = h * scale;
  return { x: rect.x + (rect.w - fw) / 2, y: rect.y + (rect.h - fh) / 2, w: fw, h: fh, scale };
}

/** Scales a `w × h` box to cover `rect`, centred (CSS `object-fit: cover`). */
export function fitCover(w: number, h: number, rect: Rect): Fit {
  const scale = w > 0 && h > 0 ? Math.max(rect.w / w, rect.h / h) : 0;
  const fw = w * scale;
  const fh = h * scale;
  return { x: rect.x + (rect.w - fw) / 2, y: rect.y + (rect.h - fh) / 2, w: fw, h: fh, scale };
}

/**
 * The part of the map to show when zooming to the hometown: the hometown's box grown to at
 * least `minShare` of the whole map (so neighbours show), shaped like the target and kept
 * inside the map where possible.
 */
export function zoomViewport(full: Rect, focus: Rect, targetAspect: number, minShare = 0.36): Rect {
  const aspect = targetAspect > 0 ? targetAspect : 1;
  let w = Math.max(focus.w * 3, full.w * minShare);
  let h = Math.max(focus.h * 3, full.h * minShare);
  // Match the target's shape by growing the short side.
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  // Never larger than the map's own fit.
  if (w > full.w && h > full.h) {
    const s = Math.max(full.w / w, full.h / h);
    w *= s;
    h *= s;
  }
  const cx = focus.x + focus.w / 2;
  const cy = focus.y + focus.h / 2;
  let x = cx - w / 2;
  let y = cy - h / 2;
  if (w <= full.w) x = Math.min(Math.max(x, full.x), full.x + full.w - w);
  else x = full.x + (full.w - w) / 2;
  if (h <= full.h) y = Math.min(Math.max(y, full.y), full.y + full.h - h);
  else y = full.y + (full.h - h) / 2;
  return { x, y, w, h };
}

export type LevelLayout = {
  badge: Rect;
  levelTitle: Rect;
  bar: Rect;
  next: Rect;
  titleFont: number;
  nextFont: number;
};

/** Level card visual: badge on top, then the level name, a progress bar and the next goal. */
export function levelLayout(visual: Rect, u: number): LevelLayout {
  const titleFont = Math.round(u * 4.6);
  const nextFont = Math.round(u * 3.2);
  const titleH = Math.round(titleFont * 1.35);
  const barH = Math.round(u * 1.8);
  const nextH = Math.round(nextFont * LINE);
  const g = Math.round(u * 1.6);
  const textH = titleH + g + barH + g + nextH;
  const badgeRoom: Rect = {
    x: visual.x,
    y: visual.y,
    w: visual.w,
    h: Math.max(0, visual.h - textH - g * 2),
  };
  const badge = fitContain(240, 260, badgeRoom);
  const barW = Math.min(visual.w, Math.round(u * 60));
  let y = badgeRoom.y + badgeRoom.h + g * 2;
  const levelTitle: Rect = { x: visual.x, y, w: visual.w, h: titleH };
  y += titleH + g;
  const bar: Rect = { x: visual.x + (visual.w - barW) / 2, y, w: barW, h: barH };
  y += barH + g;
  const next: Rect = { x: visual.x, y, w: visual.w, h: nextH };
  return {
    badge: { x: badge.x, y: badge.y, w: badge.w, h: badge.h },
    levelTitle,
    bar,
    next,
    titleFont,
    nextFont,
  };
}

export type StampGrid = {
  cols: number;
  rows: number;
  /** Side of one cell (the stamp is drawn a little smaller). */
  cell: number;
  /** Stamps drawn (the last cell holds "+n" when `more` > 0). */
  shown: number;
  /** Stamps left off the card. */
  more: number;
  /** Top-left of the grid, centred in the area. */
  x: number;
  y: number;
};

/**
 * Lays `count` stamps out in `rect` as a grid with the biggest square cells that fit. Cells
 * never get smaller than `minCell`; when that is not enough, the last cell says "+n".
 */
export function stampGrid(count: number, rect: Rect, minCell: number): StampGrid {
  const n = Math.max(0, Math.floor(count));
  if (n === 0 || rect.w <= 0 || rect.h <= 0) {
    return { cols: 0, rows: 0, cell: 0, shown: 0, more: n, x: rect.x, y: rect.y };
  }
  let best = { cols: 1, rows: n, cell: Math.min(rect.w, rect.h / n) };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cell = Math.min(rect.w / cols, rect.h / rows);
    if (cell > best.cell) best = { cols, rows, cell };
  }
  let { cols, rows, cell } = best;
  let shown = n;
  let more = 0;
  if (cell < minCell) {
    cell = Math.min(minCell, rect.w, rect.h);
    cols = Math.max(1, Math.floor(rect.w / cell));
    rows = Math.max(1, Math.floor(rect.h / cell));
    const capacity = cols * rows;
    if (capacity < n) {
      shown = Math.max(0, capacity - 1);
      more = n - shown;
    } else {
      rows = Math.ceil(n / cols);
    }
  }
  const gridW = cols * cell;
  const gridH = rows * cell;
  return {
    cols,
    rows,
    cell,
    shown,
    more,
    x: rect.x + (rect.w - gridW) / 2,
    y: rect.y + (rect.h - gridH) / 2,
  };
}

/** The cell of stamp `i` in a grid. */
export function stampCell(grid: StampGrid, i: number): Rect {
  const col = i % Math.max(1, grid.cols);
  const row = Math.floor(i / Math.max(1, grid.cols));
  return { x: grid.x + col * grid.cell, y: grid.y + row * grid.cell, w: grid.cell, h: grid.cell };
}
