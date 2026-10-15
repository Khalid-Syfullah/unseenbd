// Shared helpers for the Unseen BD asset generators.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as hb from 'harfbuzzjs';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../..');
export const OUT = path.join(REPO, 'assets');
export const DATA = path.join(REPO, 'data');

export const FONT_FILES = {
  serif: path.join(HERE, 'fonts/DMSerifDisplay-Regular.ttf'),
  sans: path.join(HERE, 'fonts/HindSiliguri-Regular.ttf'),
  sansSemi: path.join(HERE, 'fonts/HindSiliguri-SemiBold.ttf'),
  sansBold: path.join(HERE, 'fonts/HindSiliguri-Bold.ttf'),
};

// Brand palette — see assets/brand/BRAND.md
export const C = {
  ink: '#10172E',      // night navy (text, dark UI)
  night: '#0A1024',    // dark background
  paper: '#FBF6EC',    // warm paper (light background)
  sand: '#F1E6D0',
  forest: '#0E6B4E',   // primary green
  leaf: '#1FA06C',
  moss: '#7DBE8E',
  sun: '#E2483A',      // sun red
  marigold: '#F2A541', // accent
  river: '#2E86A8',
  mist: '#CFE1F1',
  clay: '#B9673F',
  stone: '#8A8F9C',
};

export const DIVISION_COLORS = {
  rangpur: '#E3B04B', rajshahi: '#D9824B', mymensingh: '#9A7CC0', sylhet: '#3FA37F',
  dhaka: '#D2584A', khulna: '#2F8A6A', barishal: '#3E98C0', chattogram: '#5B7DBE',
};

export const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
export function write(rel, content) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

// ---------- text -> SVG path (HarfBuzz shaping, correct for Bengali conjuncts) ----------
const fontCache = new Map();
function hbFont(key) {
  if (!fontCache.has(key)) {
    const data = fs.readFileSync(FONT_FILES[key]);
    const blob = new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    const face = new hb.Face(blob);
    const font = new hb.Font(face);
    fontCache.set(key, { face, font, upem: face.upem ?? face.getUpem?.() ?? 1000 });
  }
  return fontCache.get(key);
}

/** Returns { d, width } for text set at `size` px with its baseline at (x, y). anchor: start|middle|end */
export function textPath(text, { font = 'sans', size = 32, x = 0, y = 0, anchor = 'start', tracking = 0, digits = 2 } = {}) {
  const { font: f, upem } = hbFont(font);
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(f, buf);
  const infos = buf.getGlyphInfos();
  const pos = buf.getGlyphPositions();
  const s = size / upem;
  let adv = 0;
  const glyphs = infos.map((g, i) => {
    const p = pos[i];
    const item = { gid: g.codepoint, x: adv + p.xOffset, y: p.yOffset };
    adv += p.xAdvance + tracking * upem;
    return item;
  });
  const width = adv * s;
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const parts = [];
  for (const g of glyphs) {
    const raw = f.glyphToPath(g.gid);
    if (!raw) continue;
    parts.push(transformPath(raw, (px, py) => [x0 + (g.x + px) * s, y - (g.y + py) * s], digits));
  }
  buf.destroy?.();
  return { d: parts.join(''), width };
}

function transformPath(d, fn, digits = 2) {
  // HarfBuzz emits absolute M L Q C Z commands
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, (_, cmd, args) => {
    const nums = args.trim() ? args.trim().split(/[ ,]+/).map(Number) : [];
    const out = [];
    for (let i = 0; i < nums.length; i += 2) {
      const [a, b] = fn(nums[i], nums[i + 1]);
      out.push(+a.toFixed(digits), +b.toFixed(digits));
    }
    return cmd + out.join(' ');
  });
}

/** Fit text into maxWidth by shrinking the size. */
export function fitText(text, opts, maxWidth) {
  let t = textPath(text, opts);
  if (t.width > maxWidth) t = textPath(text, { ...opts, size: opts.size * (maxWidth / t.width) });
  return t;
}

// ---------- rendering ----------
export function renderPng(svg, width, height) {
  const r = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: { loadSystemFonts: false, fontFiles: Object.values(FONT_FILES), defaultFontFamily: 'Hind Siliguri' },
    background: 'rgba(0,0,0,0)',
  });
  return r.render().asPng();
}

export async function savePng(svg, rel, width) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, renderPng(svg, width));
  return p;
}

export async function saveWebp(svg, rel, width, quality = 82) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  await sharp(renderPng(svg, width)).webp({ quality, effort: 5 }).toFile(p);
  return p;
}

// ---------- seeded randomness ----------
export function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  const next = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export const r2 = (n) => Math.round(n * 100) / 100;

// Colour helpers
export function mix(a, b, t) {
  const pa = hex(a), pb = hex(b);
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function hex(c) { const n = c.replace('#', ''); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)); }

export const svgDoc = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${extra}>${body}</svg>\n`;
