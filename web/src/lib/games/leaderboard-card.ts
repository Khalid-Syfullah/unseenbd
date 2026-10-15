/**
 * The leaderboard image card: the top players of a game drawn on a canvas, with the same themes,
 * sizes, background and text fitting as the share-card maker (`@/lib/card`).
 */
import {
  CARD_SIZES,
  cardTheme,
  cardUnit,
  drawFitted,
  font,
  isDarkTheme,
  paintBackground,
  roundRect,
  safeArea,
  withAlpha,
  type CardFonts,
  type Rect,
  type ThemeKey,
} from "@/lib/card";
import { localizeDigits } from "@/lib/format";

export const LEADERBOARD_CARD_SIZES = ["square", "post", "story"] as const;
export type LeaderboardCardSize = (typeof LEADERBOARD_CARD_SIZES)[number];

/** Rows that fit each size. */
export const LEADERBOARD_CARD_ROWS: Readonly<Record<LeaderboardCardSize, number>> = {
  square: 8,
  post: 10,
  story: 10,
};

export type LeaderboardCardRow = { rank: number; name: string; score: number; total: number };

export type LeaderboardCardInput = {
  theme: ThemeKey;
  size: LeaderboardCardSize;
  /** "Top players". */
  title: string;
  /** The game's name. */
  subtitle: string;
  rows: readonly LeaderboardCardRow[];
  /** Optional line under the list: "My score today: 15 / 20". */
  mine?: string;
  /** Shown when there are no rows yet. */
  empty: string;
  /** The small URL line at the bottom. */
  url: string;
  /** For numerals (Bengali digits in `bn`). */
  lang: string;
};

export type LeaderboardCardLayout = {
  w: number;
  h: number;
  unit: number;
  header: Rect;
  title: Rect;
  subtitle: Rect;
  list: Rect;
  rows: Rect[];
  mine: Rect | null;
  footer: Rect;
};

/** Where everything goes. Pure, so tests can check that nothing leaves the safe area. */
export function leaderboardLayout(
  size: LeaderboardCardSize,
  rowCount: number,
  withMine: boolean,
): LeaderboardCardLayout {
  const s = CARD_SIZES[size];
  const u = cardUnit(s);
  const safe = safeArea(s);
  const header: Rect = { x: safe.x, y: safe.y, w: safe.w, h: Math.round(u * 7) };
  const title: Rect = {
    x: safe.x,
    y: header.y + header.h + u * 4,
    w: safe.w,
    h: Math.round(u * 9),
  };
  const subtitle: Rect = { x: safe.x, y: title.y + title.h + u, w: safe.w, h: Math.round(u * 5) };
  const footer: Rect = { x: safe.x, y: safe.y + safe.h - u * 4, w: safe.w, h: Math.round(u * 4) };
  const mine: Rect | null = withMine
    ? { x: safe.x, y: footer.y - u * 9, w: safe.w, h: Math.round(u * 6.5) }
    : null;
  const listTop = subtitle.y + subtitle.h + u * 4;
  const listBottom = (mine ? mine.y : footer.y) - u * 3;
  const list: Rect = { x: safe.x, y: listTop, w: safe.w, h: Math.max(0, listBottom - listTop) };
  const n = Math.max(1, Math.min(rowCount, LEADERBOARD_CARD_ROWS[size]));
  const gap = u * 1.2;
  const rowH = Math.min(u * 9, (list.h - gap * (n - 1)) / n);
  const rows: Rect[] = [];
  for (let i = 0; i < Math.min(rowCount, LEADERBOARD_CARD_ROWS[size]); i += 1) {
    rows.push({ x: list.x, y: list.y + i * (rowH + gap), w: list.w, h: rowH });
  }
  return { w: s.w, h: s.h, unit: u, header, title, subtitle, list, rows, mine, footer };
}

const MEDALS = ["#E3B04B", "#B8C2CC", "#C98B5A"] as const;

export type LeaderboardCardEnv = { fonts: CardFonts; logo?: CanvasImageSource | null };

/** Draws the card onto `canvas` (resized to the export size). */
export function renderLeaderboardCard(
  canvas: HTMLCanvasElement,
  input: LeaderboardCardInput,
  env: LeaderboardCardEnv,
) {
  const rows = input.rows.slice(0, LEADERBOARD_CARD_ROWS[input.size]);
  const L = leaderboardLayout(input.size, rows.length, !!input.mine);
  canvas.width = L.w;
  canvas.height = L.h;
  const g = canvas.getContext("2d");
  if (!g) return;
  const theme = cardTheme(input.theme);
  const dark = isDarkTheme(theme);
  const u = L.unit;
  const digits = (v: string | number) => localizeDigits(v, input.lang);

  paintBackground(g, L.w, L.h, u, theme);

  // Wordmark.
  let x = L.header.x;
  if (env.logo) {
    g.drawImage(env.logo, x, L.header.y, L.header.h, L.header.h);
    x += L.header.h + u * 1.6;
  }
  g.font = font(400, u * 5.2, env.fonts.display);
  g.textBaseline = "middle";
  g.textAlign = "left";
  const cy = L.header.y + L.header.h / 2;
  g.fillStyle = theme.text;
  g.fillText("Unseen ", x, cy);
  g.fillStyle = dark ? theme.accent : "#E2483A";
  g.fillText("BD", x + g.measureText("Unseen ").width, cy);

  drawFitted(g, input.title, L.title, {
    weight: 400,
    px: u * 8,
    family: env.fonts.display,
    color: theme.text,
  });
  drawFitted(g, input.subtitle, L.subtitle, {
    weight: 600,
    px: u * 4.2,
    family: env.fonts.ui,
    color: theme.accent,
  });

  if (!rows.length) {
    drawFitted(
      g,
      input.empty,
      { ...L.list, h: u * 10 },
      {
        weight: 600,
        px: u * 4,
        family: env.fonts.ui,
        color: withAlpha(theme.text, 0.75),
      },
    );
  }

  rows.forEach((row, i) => {
    const r = L.rows[i]!;
    roundRect(g, r, u * 2);
    g.fillStyle = withAlpha(dark ? "#FFFFFF" : theme.text, i % 2 === 0 ? 0.08 : 0.04);
    g.fill();
    const pad = u * 2;
    const badge = r.h * 0.62;
    const bx = r.x + pad + badge / 2;
    const by = r.y + r.h / 2;
    g.beginPath();
    g.arc(bx, by, badge / 2, 0, Math.PI * 2);
    g.fillStyle = row.rank <= 3 ? MEDALS[row.rank - 1]! : withAlpha(theme.text, 0.14);
    g.fill();
    drawFitted(
      g,
      digits(row.rank),
      { x: bx - badge / 2, y: by - badge / 2, w: badge, h: badge },
      {
        weight: 700,
        px: badge * 0.5,
        family: env.fonts.ui,
        color: row.rank <= 3 ? "#10172E" : theme.text,
        align: "center",
      },
    );
    const scoreText = digits(`${row.score} / ${row.total}`);
    g.font = font(700, r.h * 0.42, env.fonts.ui);
    const scoreW = Math.min(r.w * 0.35, g.measureText(scoreText).width);
    const scoreRect = { x: r.x + r.w - pad - scoreW, y: r.y, w: scoreW, h: r.h };
    drawFitted(g, scoreText, scoreRect, {
      weight: 700,
      px: r.h * 0.42,
      family: env.fonts.ui,
      color: theme.text,
      align: "right",
    });
    const nameX = bx + badge / 2 + pad;
    drawFitted(
      g,
      row.name,
      { x: nameX, y: r.y, w: scoreRect.x - pad - nameX, h: r.h },
      {
        weight: 600,
        px: r.h * 0.4,
        family: env.fonts.ui,
        color: theme.text,
      },
    );
  });

  if (input.mine && L.mine) {
    roundRect(g, L.mine, u * 2);
    g.fillStyle = withAlpha(theme.accent, dark ? 0.28 : 0.2);
    g.fill();
    drawFitted(
      g,
      input.mine,
      { ...L.mine, x: L.mine.x + u * 2.5, w: L.mine.w - u * 5 },
      {
        weight: 700,
        px: L.mine.h * 0.46,
        family: env.fonts.ui,
        color: theme.text,
        align: "center",
      },
    );
  }

  drawFitted(g, input.url, L.footer, {
    weight: 600,
    px: u * 3,
    family: env.fonts.ui,
    color: withAlpha(theme.text, 0.7),
  });
}
