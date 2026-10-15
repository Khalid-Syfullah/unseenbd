// Stylised building silhouettes for the place covers. Each builder draws centred on x, standing on ground line g, at scale s.
import { mix, f1 } from './scene.mjs';

const R = (x, y, w, h, c, extra = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${c}"${extra}/>`;
function arch(x, y, w, h, c) { // doorway with round top, (x,y)= bottom-left
  const r = w / 2;
  return `<path d="M${f1(x)} ${f1(y)}V${f1(y - h + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y - h + r)}V${f1(y)}Z" fill="${c}"/>`;
}
function pointedArch(x, y, w, h, c) {
  return `<path d="M${f1(x)} ${f1(y)}V${f1(y - h * 0.6)}Q${f1(x)} ${f1(y - h)} ${f1(x + w / 2)} ${f1(y - h)}Q${f1(x + w)} ${f1(y - h)} ${f1(x + w)} ${f1(y - h * 0.6)}V${f1(y)}Z" fill="${c}"/>`;
}
function dome(cx, base, r, c, { finial = true, drum = 0, drumCol = null, onion = true } = {}) {
  let s = drum ? R(cx - r * 0.95, base - drum, r * 1.9, drum, drumCol ?? c) : '';
  const y = base - drum;
  s += onion
    ? `<path d="M${f1(cx - r)} ${f1(y)}C${f1(cx - r * 1.08)} ${f1(y - r * 1.05)} ${f1(cx - r * 0.25)} ${f1(y - r * 1.2)} ${f1(cx)} ${f1(y - r * 1.5)}C${f1(cx + r * 0.25)} ${f1(y - r * 1.2)} ${f1(cx + r * 1.08)} ${f1(y - r * 1.05)} ${f1(cx + r)} ${f1(y)}Z" fill="${c}"/>`
    : `<path d="M${f1(cx - r)} ${f1(y)}A${f1(r)} ${f1(r * 0.95)} 0 0 1 ${f1(cx + r)} ${f1(y)}Z" fill="${c}"/>`;
  if (finial) s += `<path d="M${f1(cx)} ${f1(y - r * (onion ? 1.5 : 0.95))}v-${f1(r * 0.45)}" stroke="${c}" stroke-width="${f1(Math.max(2, r * 0.08))}" stroke-linecap="round"/><circle cx="${f1(cx)}" cy="${f1(y - r * (onion ? 1.62 : 1.1))}" r="${f1(Math.max(2, r * 0.07))}" fill="${c}"/>`;
  return s;
}
const merlons = (x0, x1, y, w, h, c) => { let s = ''; for (let x = x0; x < x1 - w * 0.5; x += w * 2) s += R(x, y - h, w, h, c); return s; };

// ---------------- mosques ----------------
export function mosque(x, g, s, P, { domes = 3, minarets = true, style = 'classic' } = {}) {
  let out = '';
  if (style === 'many') {
    const w = 460 * s, h = 96 * s, x0 = x - w / 2;
    for (let row = 2; row >= 0; row--) for (let i = 0; i < 11; i++) {
      const cx = x0 + 26 * s + i * (w - 52 * s) / 10 + (row % 2) * 8 * s;
      out += dome(cx, g - h + 2 - row * 7 * s, 17 * s, mix(P.roof, P.light, row * 0.12), { finial: false, onion: false });
    }
    out += R(x0, g - h, w, h, P.wall);
    for (let i = 0; i < 11; i++) out += pointedArch(x0 + 18 * s + i * (w - 36 * s) / 11 + 6 * s, g, 22 * s, 52 * s, P.dark);
    for (const tx of [x0 - 10 * s, x0 + w - 24 * s]) out += R(tx, g - h - 40 * s, 34 * s, h + 40 * s, mix(P.wall, P.dark, 0.15)) + dome(tx + 17 * s, g - h - 40 * s, 19 * s, P.roof, { onion: false });
    return out;
  }
  if (style === 'modern') {
    out += R(x - 120 * s, g - 210 * s, 240 * s, 210 * s, P.wall) + R(x - 220 * s, g - 90 * s, 120 * s, 90 * s, mix(P.wall, P.dark, 0.1));
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) out += R(x - 104 * s + c * 36 * s, g - 196 * s + r * 32 * s, 18 * s, 18 * s, P.dark, ' opacity=".55"');
    return out + R(x - 130 * s, g - 214 * s, 260 * s, 10 * s, P.roof);
  }
  if (style === 'eidgah') {
    out += R(x - 260 * s, g - 70 * s, 520 * s, 70 * s, P.wall) + merlons(x - 260 * s, x + 260 * s, g - 70 * s, 14 * s, 10 * s, P.wall);
    out += R(x - 60 * s, g - 150 * s, 120 * s, 150 * s, P.wall) + pointedArch(x - 32 * s, g, 64 * s, 110 * s, P.dark);
    for (const tx of [x - 80 * s, x + 64 * s]) out += R(tx, g - 190 * s, 16 * s, 190 * s, mix(P.wall, P.dark, 0.12)) + dome(tx + 8 * s, g - 190 * s, 12 * s, P.roof);
    return out;
  }
  const w = (domes === 1 ? 200 : domes === 3 ? 300 : 360) * s, h = 104 * s, x0 = x - w / 2;
  // domes
  if (domes === 1) out += dome(x, g - h, 78 * s, P.roof, { drum: 14 * s, drumCol: P.wall });
  else {
    const n = domes, big = domes === 3 ? 62 * s : 52 * s;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1), cx = x0 + w * (0.18 + 0.64 * t), mid = i === (n - 1) / 2;
      out += dome(cx, g - h, mid ? big : big * 0.72, P.roof, { drum: 10 * s, drumCol: P.wall });
    }
  }
  out += R(x0, g - h, w, h, P.wall) + R(x0 - 6 * s, g - h - 6 * s, w + 12 * s, 10 * s, mix(P.wall, P.dark, 0.12));
  const na = domes === 1 ? 3 : 5;
  for (let i = 0; i < na; i++) {
    const aw = (w - 40 * s) / na * 0.6, ax = x0 + 20 * s + i * (w - 40 * s) / na + ((w - 40 * s) / na - aw) / 2;
    out += pointedArch(ax, g, aw, (i === (na - 1) / 2 ? 78 : 62) * s, P.dark);
  }
  if (minarets) for (const tx of [x0 - 22 * s, x0 + w + 4 * s]) {
    out += R(tx, g - h - 70 * s, 18 * s, h + 70 * s, mix(P.wall, P.dark, 0.08));
    for (let k = 1; k <= 3; k++) out += R(tx - 3 * s, g - h - 70 * s + k * 40 * s, 24 * s, 5 * s, mix(P.wall, P.dark, 0.25));
    out += dome(tx + 9 * s, g - h - 70 * s, 14 * s, P.roof);
  }
  return out;
}

// ---------------- Hindu temples ----------------
function shikhara(cx, base, w, h, c, band) {
  let s = `<path d="M${f1(cx - w / 2)} ${f1(base)}C${f1(cx - w * 0.55)} ${f1(base - h * 0.55)} ${f1(cx - w * 0.28)} ${f1(base - h * 0.92)} ${f1(cx)} ${f1(base - h)}C${f1(cx + w * 0.28)} ${f1(base - h * 0.92)} ${f1(cx + w * 0.55)} ${f1(base - h * 0.55)} ${f1(cx + w / 2)} ${f1(base)}Z" fill="${c}"/>`;
  for (let k = 1; k < 6; k++) {
    const yy = base - (h * k) / 6.2, ww = w * (1 - (k / 6.4) ** 1.6);
    s += R(cx - ww / 2, yy, ww, Math.max(1.5, h * 0.012), band, ' opacity=".5"');
  }
  return s + `<ellipse cx="${f1(cx)}" cy="${f1(base - h)}" rx="${f1(w * 0.16)}" ry="${f1(w * 0.06)}" fill="${c}"/><path d="M${f1(cx)} ${f1(base - h - w * 0.05)}v-${f1(w * 0.22)}" stroke="${c}" stroke-width="${f1(Math.max(2, w * 0.04))}"/>`;
}
export function temple(x, g, s, P, { style = 'shikhara', count = 11 } = {}) {
  let out = '';
  if (style === 'nabaratna') {
    out += R(x - 120 * s, g - 100 * s, 240 * s, 100 * s, P.wall) + R(x - 85 * s, g - 165 * s, 170 * s, 65 * s, mix(P.wall, P.dark, 0.08));
    for (let i = 0; i < 3; i++) out += arch(x - 90 * s + i * 66 * s, g, 48 * s, 66 * s, P.dark);
    for (const dx of [-112, 112]) out += shikhara(x + dx * s * 0.9, g - 100 * s, 38 * s, 58 * s, P.roof, P.dark);
    for (const dx of [-72, 72]) out += shikhara(x + dx * s, g - 165 * s, 40 * s, 62 * s, P.roof, P.dark);
    out += shikhara(x, g - 165 * s, 64 * s, 120 * s, P.roof, P.dark);
    return out + R(x - 126 * s, g - 104 * s, 252 * s, 8 * s, P.dark, ' opacity=".35"');
  }
  if (style === 'jorbangla') {
    for (const dx of [-75, 75]) {
      const cx = x + dx * s;
      out += R(cx - 75 * s, g - 90 * s, 150 * s, 90 * s, P.wall) + arch(cx - 22 * s, g, 44 * s, 60 * s, P.dark);
      out += `<path d="M${f1(cx - 84 * s)} ${f1(g - 86 * s)}Q${f1(cx)} ${f1(g - 170 * s)} ${f1(cx + 84 * s)} ${f1(g - 86 * s)}Q${f1(cx)} ${f1(g - 120 * s)} ${f1(cx - 84 * s)} ${f1(g - 86 * s)}Z" fill="${P.roof}"/>`;
    }
    return out + shikhara(x, g - 128 * s, 34 * s, 70 * s, P.roof, P.dark);
  }
  if (style === 'math') {
    out += R(x - 60 * s, g - 60 * s, 120 * s, 60 * s, P.wall) + arch(x - 18 * s, g, 36 * s, 46 * s, P.dark);
    out += `<path d="M${f1(x - 54 * s)} ${f1(g - 60 * s)}L${f1(x - 18 * s)} ${f1(g - 380 * s)}H${f1(x + 18 * s)}L${f1(x + 54 * s)} ${f1(g - 60 * s)}Z" fill="${P.roof}"/>`;
    for (let k = 1; k < 9; k++) { const yy = g - 60 * s - k * 36 * s, ww = 108 * s - k * 9 * s; out += R(x - ww / 2, yy, ww, 4 * s, P.dark, ' opacity=".35"'); }
    return out + `<ellipse cx="${f1(x)}" cy="${f1(g - 382 * s)}" rx="${f1(16 * s)}" ry="${f1(6 * s)}" fill="${P.roof}"/>`;
  }
  if (style === 'row') {
    const n = Math.min(count, 7), step = 100 * s;
    for (let i = 0; i < n; i++) {
      const cx = x + (i - (n - 1) / 2) * step, k = 1 - Math.abs(i - (n - 1) / 2) * 0.06;
      out += R(cx - 36 * s * k, g - 60 * s * k, 72 * s * k, 60 * s * k, P.wall) + arch(cx - 12 * s * k, g, 24 * s * k, 34 * s * k, P.dark) + shikhara(cx, g - 60 * s * k, 64 * s * k, 110 * s * k, P.roof, P.dark);
    }
    return out;
  }
  out += R(x - 95 * s, g - 22 * s, 190 * s, 22 * s, mix(P.wall, P.dark, 0.18));
  out += R(x - 62 * s, g - 100 * s, 124 * s, 78 * s, P.wall) + arch(x - 20 * s, g - 22 * s, 40 * s, 58 * s, P.dark);
  return out + shikhara(x, g - 100 * s, 120 * s, 230 * s, P.roof, P.dark);
}

// ---------------- Buddhist ----------------
export function stupa(x, g, s, P, { style = 'zedi' } = {}) {
  let out = '';
  if (style === 'kyang') {
    out += R(x - 150 * s, g - 40 * s, 300 * s, 40 * s, P.dark, ' opacity=".6"');
    for (let i = -5; i <= 5; i++) out += R(x + i * 28 * s - 3 * s, g - 40 * s, 6 * s, 40 * s, P.dark);
    out += R(x - 130 * s, g - 110 * s, 260 * s, 70 * s, P.wall);
    for (let k = 0; k < 3; k++) {
      const yb = g - 110 * s - k * 46 * s, ww = (300 - k * 80) * s;
      out += `<path d="M${f1(x - ww / 2)} ${f1(yb)}L${f1(x - ww * 0.3)} ${f1(yb - 46 * s)}H${f1(x + ww * 0.3)}L${f1(x + ww / 2)} ${f1(yb)}Z" fill="${P.roof}"/><path d="M${f1(x - ww / 2)} ${f1(yb)}l-${f1(12 * s)} -${f1(14 * s)}M${f1(x + ww / 2)} ${f1(yb)}l${f1(12 * s)} -${f1(14 * s)}" stroke="${P.accent}" stroke-width="${f1(5 * s)}" stroke-linecap="round"/>`;
    }
    return out + `<path d="M${f1(x)} ${f1(g - 248 * s)}v-${f1(50 * s)}" stroke="${P.accent}" stroke-width="${f1(6 * s)}"/>`;
  }
  for (let k = 0; k < 3; k++) out += R(x - (170 - k * 40) * s, g - (k + 1) * 30 * s, (340 - k * 80) * s, 30 * s, mix(P.wall, P.dark, k * 0.06));
  const b = g - 90 * s;
  out += `<path d="M${f1(x - 100 * s)} ${f1(b)}C${f1(x - 100 * s)} ${f1(b - 90 * s)} ${f1(x - 40 * s)} ${f1(b - 120 * s)} ${f1(x - 18 * s)} ${f1(b - 170 * s)}L${f1(x)} ${f1(b - 300 * s)}L${f1(x + 18 * s)} ${f1(b - 170 * s)}C${f1(x + 40 * s)} ${f1(b - 120 * s)} ${f1(x + 100 * s)} ${f1(b - 90 * s)} ${f1(x + 100 * s)} ${f1(b)}Z" fill="${P.roof}"/>`;
  for (let k = 1; k <= 5; k++) out += R(x - (26 - k * 3) * s, b - 150 * s - k * 22 * s, (52 - k * 6) * s, 5 * s, P.light, ' opacity=".6"');
  out += `<path d="M${f1(x - 14 * s)} ${f1(b - 300 * s)}h${f1(28 * s)}l-${f1(14 * s)} -${f1(16 * s)}z" fill="${P.accent}"/>`;
  for (const dx of [-150, 150]) out += `<path d="M${f1(x + dx * s - 22 * s)} ${f1(g - 30 * s)}Q${f1(x + dx * s)} ${f1(g - 110 * s)} ${f1(x + dx * s + 22 * s)} ${f1(g - 30 * s)}Z" fill="${P.roof}"/>`;
  return out;
}

// ---------------- church, shrine, tomb ----------------
export function church(x, g, s, P) {
  let out = R(x - 140 * s, g - 110 * s, 220 * s, 110 * s, P.wall);
  out += `<path d="M${f1(x - 150 * s)} ${f1(g - 110 * s)}L${f1(x - 30 * s)} ${f1(g - 190 * s)}L${f1(x + 90 * s)} ${f1(g - 110 * s)}Z" fill="${P.roof}"/>`;
  for (let i = 0; i < 4; i++) out += arch(x - 122 * s + i * 50 * s, g - 30 * s, 22 * s, 50 * s, P.dark);
  out += R(x + 80 * s, g - 230 * s, 70 * s, 230 * s, mix(P.wall, P.dark, 0.06)) + arch(x + 98 * s, g, 34 * s, 56 * s, P.dark) + arch(x + 103 * s, g - 150 * s, 24 * s, 40 * s, P.dark);
  out += `<path d="M${f1(x + 74 * s)} ${f1(g - 230 * s)}L${f1(x + 115 * s)} ${f1(g - 330 * s)}L${f1(x + 156 * s)} ${f1(g - 230 * s)}Z" fill="${P.roof}"/>`;
  return out + `<path d="M${f1(x + 115 * s)} ${f1(g - 330 * s)}v-${f1(36 * s)}M${f1(x + 103 * s)} ${f1(g - 354 * s)}h${f1(24 * s)}" stroke="${P.roof}" stroke-width="${f1(5 * s)}"/>`;
}
export function shrine(x, g, s, P, { flags = true } = {}) {
  let out = R(x - 90 * s, g - 110 * s, 180 * s, 110 * s, P.wall) + arch(x - 26 * s, g, 52 * s, 76 * s, P.dark);
  out += dome(x, g - 110 * s, 80 * s, P.roof, { drum: 16 * s, drumCol: P.wall });
  for (const dx of [-90, 76]) out += R(x + dx * s, g - 150 * s, 14 * s, 150 * s, mix(P.wall, P.dark, 0.1)) + dome(x + dx * s + 7 * s, g - 150 * s, 11 * s, P.roof);
  if (flags) for (const dx of [-160, 150]) out += `<path d="M${f1(x + dx * s)} ${f1(g)}v-${f1(150 * s)}" stroke="${P.dark}" stroke-width="${f1(3 * s)}"/><path d="M${f1(x + dx * s)} ${f1(g - 150 * s)}l${f1(40 * s)} ${f1(12 * s)}l-${f1(40 * s)} ${f1(12 * s)}z" fill="${P.accent}"/>`;
  return out;
}
export function tomb(x, g, s, P) {
  let out = R(x - 130 * s, g - 24 * s, 260 * s, 24 * s, mix(P.wall, P.dark, 0.2)) + R(x - 100 * s, g - 130 * s, 200 * s, 106 * s, P.wall);
  for (let i = 0; i < 3; i++) out += pointedArch(x - 78 * s + i * 56 * s, g - 24 * s, 44 * s, 72 * s, P.dark);
  return out + dome(x, g - 130 * s, 84 * s, P.roof, { onion: false, drum: 18 * s, drumCol: P.wall }) + merlons(x - 100 * s, x + 100 * s, g - 130 * s, 10 * s, 8 * s, P.wall);
}

// ---------------- forts, ruins ----------------
export function fort(x, g, s, P, { ruined = false, domeInside = false } = {}) {
  let out = '';
  if (domeInside) out += dome(x + 140 * s, g - 110 * s, 54 * s, P.roof, { onion: false, drum: 20 * s, drumCol: mix(P.wall, P.light, 0.2) }) + R(x + 90 * s, g - 110 * s, 100 * s, 30 * s, mix(P.wall, P.light, 0.2));
  const x0 = x - 380 * s, x1 = x + 380 * s, h = 96 * s;
  if (ruined) {
    let d = `M${f1(x0)} ${f1(g)}`;
    for (let xx = x0; xx <= x1; xx += 30 * s) d += `L${f1(xx)} ${f1(g - h * (0.35 + 0.55 * Math.abs(Math.sin(xx * 0.013))))}`;
    return out + `<path d="${d}L${f1(x1)} ${f1(g)}Z" fill="${P.wall}"/>`;
  }
  out += R(x0, g - h, x1 - x0, h, P.wall) + merlons(x0, x1, g - h, 14 * s, 14 * s, P.wall);
  for (const bx of [x0, x1]) out += R(bx - 34 * s, g - h - 30 * s, 68 * s, h + 30 * s, mix(P.wall, P.dark, 0.08)) + merlons(bx - 34 * s, bx + 34 * s, g - h - 30 * s, 12 * s, 12 * s, mix(P.wall, P.dark, 0.08));
  out += R(x - 80 * s, g - h - 70 * s, 160 * s, h + 70 * s, mix(P.wall, P.light, 0.08)) + merlons(x - 80 * s, x + 80 * s, g - h - 70 * s, 12 * s, 12 * s, mix(P.wall, P.light, 0.08));
  out += pointedArch(x - 36 * s, g, 72 * s, 120 * s, P.dark);
  for (const tx of [x - 96 * s, x + 80 * s]) out += R(tx, g - h - 96 * s, 16 * s, 30 * s, P.wall) + dome(tx + 8 * s, g - h - 96 * s, 14 * s, P.roof, { onion: false });
  return out;
}
export function ruins(x, g, s, P, { style = 'terrace' } = {}) {
  let out = '';
  if (style === 'mounds') {
    for (const [dx, w, h] of [[-200, 220, 90], [0, 300, 140], [220, 200, 80]]) out += `<path d="M${f1(x + (dx - w / 2) * s)} ${f1(g)}Q${f1(x + dx * s)} ${f1(g - h * 2 * s)} ${f1(x + (dx + w / 2) * s)} ${f1(g)}Z" fill="${P.wall}"/>`;
    return out;
  }
  const tiers = [[520, 46], [380, 50], [250, 56], [130, 50]];
  let y = g;
  tiers.forEach(([w, h], i) => {
    out += R(x - w * s / 2, y - h * s, w * s, h * s, mix(P.wall, P.dark, i * 0.07));
    for (let xx = x - w * s / 2 + 12 * s; xx < x + w * s / 2 - 12 * s; xx += 26 * s) out += R(xx, y - h * s + 14 * s, 12 * s, 18 * s, P.dark, ' opacity=".35"');
    y -= h * s;
  });
  return out + `<path d="M${f1(x - 40 * s)} ${f1(y)}Q${f1(x)} ${f1(y - 50 * s)} ${f1(x + 40 * s)} ${f1(y)}Z" fill="${P.wall}"/>`;
}

// ---------------- palaces & houses ----------------
export function palace(x, g, s, P, { style = 'rajbari', decay = false, bays = 9, storeys = 2, portico = true } = {}) {
  const bw = 58 * s, w = bays * bw + 30 * s, fh = 84 * s, h = storeys * fh, x0 = x - w / 2;
  let out = '';
  if (style === 'manzil') out += dome(x, g - h - 40 * s, 66 * s, P.roof, { drum: 34 * s, drumCol: P.wall, onion: false });
  out += R(x0, g - h, w, h, P.wall);
  out += R(x0 - 8 * s, g - h - 12 * s, w + 16 * s, 12 * s, mix(P.wall, P.light, 0.25));
  for (let xx = x0; xx < x0 + w; xx += 12 * s) out += R(xx, g - h - 26 * s, 5 * s, 14 * s, mix(P.wall, P.light, 0.25));
  for (let k = 1; k < storeys; k++) out += R(x0 - 8 * s, g - k * fh - 4 * s, w + 16 * s, 8 * s, mix(P.wall, P.light, 0.25));
  for (let i = 0; i < bays; i++) {
    const cx = x0 + 15 * s + bw * (i + 0.5);
    for (let k = 0; k < storeys; k++) out += arch(cx - 15 * s, g - k * fh - (k ? 4 * s : 0), 30 * s, fh * 0.68, P.dark);
    if (i < bays - 1) out += R(cx + bw / 2 - 4 * s, g - h + 6 * s, 8 * s, h - 6 * s, mix(P.wall, P.light, 0.35));
  }
  if (portico) {
    const pw = Math.min(170 * s, w * 0.36);
    out += R(x - pw / 2, g - h - 10 * s, pw, h + 10 * s, mix(P.wall, P.light, 0.12));
    out += `<path d="M${f1(x - pw / 2 - 10 * s)} ${f1(g - h - 10 * s)}L${f1(x)} ${f1(g - h - 64 * s)}L${f1(x + pw / 2 + 10 * s)} ${f1(g - h - 10 * s)}Z" fill="${mix(P.wall, P.light, 0.2)}"/>`;
    for (let i = 0; i < 4; i++) out += R(x - pw / 2 + 12 * s + i * (pw - 32 * s) / 3, g - h + 6 * s, 9 * s, h - 6 * s, mix(P.wall, P.light, 0.45));
    out += R(x - pw / 2 - 20 * s, g - 12 * s, pw + 40 * s, 12 * s, mix(P.wall, P.dark, 0.2));
  }
  if (decay) for (let i = 0; i < 14; i++) out += `<ellipse cx="${f1(x0 + ((i * 97) % 100) / 100 * w)}" cy="${f1(g - h + ((i * 53) % 100) / 100 * h)}" rx="${f1((10 + (i % 4) * 7) * s)}" ry="${f1((5 + (i % 3) * 5) * s)}" fill="${P.dark}" opacity=".18"/>`;
  return out;
}
export function bungalow(x, g, s, P) {
  let out = R(x - 170 * s, g - 90 * s, 340 * s, 90 * s, P.wall);
  out += `<path d="M${f1(x - 200 * s)} ${f1(g - 90 * s)}L${f1(x - 120 * s)} ${f1(g - 160 * s)}H${f1(x + 120 * s)}L${f1(x + 200 * s)} ${f1(g - 90 * s)}Z" fill="${P.roof}"/>`;
  for (let i = 0; i < 8; i++) out += R(x - 160 * s + i * 45 * s, g - 90 * s, 8 * s, 90 * s, mix(P.wall, P.light, 0.35));
  for (let i = 0; i < 4; i++) out += arch(x - 128 * s + i * 76 * s, g, 30 * s, 56 * s, P.dark);
  return out + R(x + 70 * s, g - 190 * s, 18 * s, 50 * s, mix(P.roof, P.dark, 0.3));
}
export function hut(x, g, s, P, { tin = true } = {}) {
  const roof = tin ? '#9AA3A8' : '#B08A4E';
  return R(x - 70 * s, g - 60 * s, 140 * s, 60 * s, P.wall) + `<path d="M${f1(x - 88 * s)} ${f1(g - 56 * s)}L${f1(x - 50 * s)} ${f1(g - 110 * s)}H${f1(x + 50 * s)}L${f1(x + 88 * s)} ${f1(g - 56 * s)}Z" fill="${roof}"/>` + R(x - 14 * s, g - 42 * s, 28 * s, 42 * s, P.dark) + R(x + 30 * s, g - 44 * s, 22 * s, 18 * s, P.dark, ' opacity=".7"');
}
export function museum(x, g, s, P) {
  let out = '';
  for (let k = 0; k < 4; k++) out += R(x - (240 - k * 12) * s, g - (k + 1) * 9 * s, (480 - k * 24) * s, 9 * s, mix(P.wall, P.dark, 0.08 + k * 0.03));
  out += R(x - 200 * s, g - 190 * s, 400 * s, 154 * s, P.wall);
  for (let i = 0; i < 8; i++) out += R(x - 186 * s + i * 52 * s, g - 180 * s, 14 * s, 144 * s, mix(P.wall, P.light, 0.4));
  out += R(x - 210 * s, g - 200 * s, 420 * s, 14 * s, mix(P.wall, P.light, 0.2));
  return out + `<path d="M${f1(x - 214 * s)} ${f1(g - 200 * s)}L${f1(x)} ${f1(g - 268 * s)}L${f1(x + 214 * s)} ${f1(g - 200 * s)}Z" fill="${mix(P.wall, P.light, 0.15)}"/>`;
}
export function parliament(x, g, s, P) {
  let out = '';
  const blocks = [[-260, 150, 200], [-110, 120, 250], [40, 150, 290], [190, 110, 230], [-380, 90, 150]];
  for (const [dx, w, h] of blocks) {
    out += R(x + dx * s, g - h * s, w * s, h * s, mix(P.wall, P.dark, (dx + 400) / 3000));
    out += `<circle cx="${f1(x + (dx + w / 2) * s)}" cy="${f1(g - h * 0.62 * s)}" r="${f1(w * 0.26 * s)}" fill="${P.dark}" opacity=".75"/>`;
    out += `<path d="M${f1(x + (dx + w * 0.2) * s)} ${f1(g - h * 0.22 * s)}l${f1(w * 0.3 * s)} -${f1(w * 0.3 * s)}l${f1(w * 0.3 * s)} ${f1(w * 0.3 * s)}z" fill="${P.dark}" opacity=".55"/>`;
  }
  return out;
}

// ---------------- memorials, cemetery ----------------
export function smritiSoudho(x, g, s, P) {
  let out = '';
  for (let k = 6; k >= 0; k--) {
    const h = (150 + k * 52) * s, w = (420 - k * 50) * s;
    const off = (k - 3) * 22 * s; // layers step outward so each edge reads
    out += `<path d="M${f1(x + off - w / 2)} ${f1(g)}L${f1(x + off)} ${f1(g - h)}L${f1(x + off)} ${f1(g)}Z" fill="${mix(P.wall, P.dark, 0.12 + (k % 2) * 0.22)}"/><path d="M${f1(x + off)} ${f1(g - h)}L${f1(x + off + w / 2)} ${f1(g)}L${f1(x + off)} ${f1(g)}Z" fill="${mix(P.wall, P.light, 0.15 + (k % 2) * 0.35)}"/>`;
  }
  return out;
}
export function shaheedMinar(x, g, s, P) {
  let out = `<circle cx="${f1(x)}" cy="${f1(g - 200 * s)}" r="${f1(90 * s)}" fill="#E2483A"/>` + R(x - 300 * s, g - 24 * s, 600 * s, 24 * s, mix(P.wall, P.dark, 0.2));
  const frame = (cx, h, w, bend) => `<path d="M${f1(cx - w / 2)} ${f1(g - 24 * s)}V${f1(g - h)}${bend ? `L${f1(cx - w / 2 + bend)} ${f1(g - h - bend * 1.4)}H${f1(cx + w / 2 + bend)}L${f1(cx + w / 2)} ${f1(g - h)}` : `H${f1(cx + w / 2)}`}V${f1(g - 24 * s)}" fill="none" stroke="${P.wall}" stroke-width="${f1(12 * s)}"/>` +
    [1, 2, 3].map((i) => `<path d="M${f1(cx - w / 2 + (w * i) / 4)} ${f1(g - 24 * s)}V${f1(g - h)}" stroke="${P.dark}" stroke-width="${f1(3 * s)}" opacity=".7"/>`).join('');
  out += frame(x, 260 * s, 110 * s, 40 * s);
  for (const [dx, h] of [[-110, 200], [-200, 160], [110, 200], [200, 160]]) out += frame(x + dx * s, h * s, 60 * s, 0);
  return out;
}
export function obelisk(x, g, s, P) {
  return R(x - 160 * s, g - 30 * s, 320 * s, 30 * s, mix(P.wall, P.dark, 0.2)) + R(x - 70 * s, g - 60 * s, 140 * s, 30 * s, mix(P.wall, P.dark, 0.1)) +
    `<path d="M${f1(x - 34 * s)} ${f1(g - 60 * s)}L${f1(x - 22 * s)} ${f1(g - 330 * s)}L${f1(x)} ${f1(g - 370 * s)}L${f1(x + 22 * s)} ${f1(g - 330 * s)}L${f1(x + 34 * s)} ${f1(g - 60 * s)}Z" fill="${P.wall}"/><path d="M${f1(x)} ${f1(g - 370 * s)}L${f1(x + 22 * s)} ${f1(g - 330 * s)}L${f1(x + 34 * s)} ${f1(g - 60 * s)}H${f1(x)}Z" fill="${P.dark}" opacity=".2"/>`;
}
export function cemetery(r, x, g, s, P) {
  let out = '';
  for (let row = 0; row < 5; row++) {
    const y = g + row * 34 * s, k = 0.7 + row * 0.12, n = 14;
    for (let i = 0; i < n; i++) {
      const cx = x - 520 * s + i * (1040 * s) / (n - 1) + (row % 2) * 20 * s;
      out += `<path d="M${f1(cx - 9 * k * s)} ${f1(y)}V${f1(y - 24 * k * s)}a${f1(9 * k * s)} ${f1(6 * k * s)} 0 0 1 ${f1(18 * k * s)} 0V${f1(y)}Z" fill="${P.wall}"/>`;
    }
  }
  return out + `<path d="M${f1(x)} ${f1(g - 10 * s)}V${f1(g - 200 * s)}M${f1(x - 40 * s)} ${f1(g - 150 * s)}H${f1(x + 40 * s)}" stroke="${P.wall}" stroke-width="${f1(14 * s)}"/>` + R(x - 40 * s, g - 20 * s, 80 * s, 20 * s, P.wall);
}

// ---------------- bridges & industry ----------------
export function trussBridge(x, deck, s, P, n = 5) {
  let out = '';
  const span = 1500 / n;
  for (let i = 0; i < n; i++) {
    const x0 = -150 + i * span, x1 = x0 + span;
    out += R(x0 + span - 14, deck, 28, 200, P.dark);
    let lattice = '';
    for (let k = 0; k <= 8; k++) {
      const xx = x0 + (span * k) / 8, top = deck - 90 * s * Math.sin(Math.PI * k / 8);
      lattice += `M${f1(xx)} ${f1(deck)}L${f1(xx)} ${f1(top)}`;
      if (k < 8) lattice += `M${f1(xx)} ${f1(top)}L${f1(x0 + span * (k + 1) / 8)} ${f1(deck)}`;
    }
    out += `<path d="M${f1(x0)} ${f1(deck)}Q${f1((x0 + x1) / 2)} ${f1(deck - 180 * s)} ${f1(x1)} ${f1(deck)}" fill="none" stroke="${P.wall}" stroke-width="${f1(8 * s)}"/><path d="${lattice}" stroke="${P.wall}" stroke-width="${f1(3 * s)}" opacity=".85"/>`;
  }
  return out + R(-20, deck, W + 40, 12 * s, P.wall);
}
const W = 1200;
export function cableBridge(x, deck, s, P) {
  let out = R(-20, deck, W + 40, 18 * s, P.wall) + R(-20, deck + 18 * s, W + 40, 6 * s, P.dark, ' opacity=".5"');
  for (const px of [x - 260 * s, x + 260 * s]) {
    out += `<path d="M${f1(px - 34 * s)} ${f1(deck + 120 * s)}L${f1(px)} ${f1(deck - 260 * s)}L${f1(px + 34 * s)} ${f1(deck + 120 * s)}" fill="none" stroke="${P.wall}" stroke-width="${f1(18 * s)}"/>`;
    for (let k = 1; k <= 7; k++) out += `<path d="M${f1(px)} ${f1(deck - 220 * s + k * 6 * s)}L${f1(px - k * 34 * s)} ${f1(deck)}M${f1(px)} ${f1(deck - 220 * s + k * 6 * s)}L${f1(px + k * 34 * s)} ${f1(deck)}" stroke="${P.wall}" stroke-width="${f1(3.5 * s)}"/>`;
  }
  return out;
}
export function factory(x, g, s, P) {
  let out = '';
  for (let i = 0; i < 5; i++) out += `<path d="M${f1(x - 260 * s + i * 100 * s)} ${f1(g - 90 * s)}l${f1(70 * s)} -${f1(40 * s)}v${f1(40 * s)}h${f1(30 * s)}" fill="${P.roof}"/>`;
  out += R(x - 260 * s, g - 90 * s, 500 * s, 90 * s, P.wall);
  for (let i = 0; i < 9; i++) out += R(x - 240 * s + i * 54 * s, g - 70 * s, 26 * s, 34 * s, P.dark, ' opacity=".6"');
  return out + `<path d="M${f1(x + 150 * s)} ${f1(g - 90 * s)}L${f1(x + 158 * s)} ${f1(g - 330 * s)}H${f1(x + 186 * s)}L${f1(x + 194 * s)} ${f1(g - 90 * s)}Z" fill="${mix(P.wall, P.dark, 0.2)}"/>`;
}
export function oldStreet(x, g, s, P, r) {
  let out = '';
  const n = 6, w = 150 * s;
  for (let i = 0; i < n; i++) {
    const x0 = x - (n * w) / 2 + i * w, h = (150 + r.range(0, 60)) * s, col = mix(P.wall, r.pick([P.dark, P.light, P.roof]), r.range(0.05, 0.25));
    out += R(x0, g - h, w - 4 * s, h, col) + R(x0 - 2 * s, g - h - 8 * s, w, 8 * s, mix(col, P.light, 0.2));
    for (let k = 0; k < 3; k++) out += arch(x0 + 14 * s + k * 44 * s, g - h + 70 * s, 24 * s, 44 * s, P.dark) + arch(x0 + 14 * s + k * 44 * s, g, 24 * s, 50 * s, P.dark);
  }
  return out;
}
export function pillar(x, g, s, P) {
  return R(x - 14 * s, g - 260 * s, 28 * s, 260 * s, P.wall) + R(x - 22 * s, g - 270 * s, 44 * s, 14 * s, P.wall) + R(x - 26 * s, g - 10 * s, 52 * s, 10 * s, P.wall) + R(x + 2 * s, g - 260 * s, 12 * s, 260 * s, P.dark, ' opacity=".18"');
}
