// Building blocks for the illustrated place covers (1200×800, flat vector style).
import { mix, rng } from './lib.mjs';

export const W = 1200, H = 800;
const f1 = (n) => Math.round(n * 10) / 10;

// ---------- moods (sky/light palettes) ----------
export const MOODS = {
  dawn:    { sky: ['#9FB3D9', '#F3C7C1', '#FCE6CF'], sun: '#FFB38A', haze: '#F4D9D0', water: ['#C9C3D6', '#7F9BB8'], green: ['#86A894', '#4F8A6A', '#2E6B4F'], light: '#FFF4EA', shade: '#3E4E6A' },
  day:     { sky: ['#5FA8DB', '#A9D3EE', '#E6F3F7'], sun: '#FFF1B8', haze: '#D3E6EE', water: ['#9ACDE3', '#2F7FA6'], green: ['#86BE90', '#3F9663', '#1F6E47'], light: '#FFFFFF', shade: '#244257' },
  golden:  { sky: ['#EEA25A', '#F6C98C', '#FCE8C4'], sun: '#E2483A', haze: '#F3D3A2', water: ['#E7BC86', '#6E8FA0'], green: ['#A9B377', '#5E8A4E', '#2F5E3A'], light: '#FFF2D6', shade: '#4A3A2E' },
  dusk:    { sky: ['#37386F', '#B4677F', '#F2A273'], sun: '#F26B4C', haze: '#C98C8E', water: ['#C88A86', '#47457A'], green: ['#76688A', '#45496D', '#262C4A'], light: '#FFD9C2', shade: '#1D2140' },
  monsoon: { sky: ['#7F97A6', '#AFC2CC', '#DDE6E8'], sun: null, haze: '#C6D3D6', water: ['#9DB8BF', '#3F7484'], green: ['#78A882', '#2F8152', '#145C38'], light: '#F2F6F6', shade: '#22404A' },
  mist:    { sky: ['#C3D0DA', '#E1E6E6', '#F5F0E6'], sun: '#FBE3C1', haze: '#E7EBEA', water: ['#D3DEDF', '#93AEB6'], green: ['#AFC1B5', '#7E9C8A', '#4E7563'], light: '#FFFFFF', shade: '#4A5E66' },
};

export function pickMood(r, bestFrom) {
  const m = bestFrom ?? 0;
  const pool = m >= 6 && m <= 9 ? ['monsoon', 'day', 'golden', 'monsoon', 'dawn']
    : m >= 10 && m <= 11 ? ['golden', 'day', 'dusk', 'day', 'dawn', 'mist']
    : m === 12 || m <= 2 && m >= 1 ? ['mist', 'dawn', 'day', 'golden', 'mist']
    : m >= 3 && m <= 5 ? ['day', 'golden', 'dusk', 'day'] : ['day', 'golden', 'dawn'];
  return r.pick(pool);
}

// distance shading: t=0 near (own colour), t=1 far (melts into haze)
export const far = (M, col, t) => mix(col, M.haze, t);

// ---------- geometry ----------
export function smooth(pts, close = false) {
  if (pts.length < 2) return '';
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return close ? d + 'Z' : d;
}
export function ridgePts(r, { y, amp = 60, step = 120, jag = 0.5, x0 = -60, x1 = W + 60 }) {
  const pts = [];
  let v = r.range(-amp, 0);
  for (let x = x0; x <= x1 + step; x += step * r.range(0.7, 1.3)) {
    v = v * jag + r.range(-amp, amp * 0.25) * (1 - jag);
    pts.push([x, y + v]);
  }
  return pts;
}
export const ground = (pts, col, bottom = H + 5) => `<path d="${smooth(pts)}L${W + 80} ${bottom}L-80 ${bottom}Z" fill="${col}"/>`;
export function ridge(r, M, { y, amp, step, jag, t = 0.5, col }) {
  return ground(ridgePts(r, { y, amp, step, jag }), far(M, col ?? M.green[1], t));
}

// ---------- sky ----------
let uid = 0;
export function sky(M, r, { sunX, sunY, sunR = 70, clouds = 3, birds = true } = {}) {
  const id = 'sk' + uid++;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${M.sky[0]}"/><stop offset=".55" stop-color="${M.sky[1]}"/><stop offset="1" stop-color="${M.sky[2]}"/></linearGradient>
    <radialGradient id="${id}g"><stop offset="0" stop-color="${M.sun ?? '#fff'}" stop-opacity=".55"/><stop offset="1" stop-color="${M.sun ?? '#fff'}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  sunX ??= r.range(180, 1020); sunY ??= r.range(150, 330);
  if (M.sun) s += `<circle cx="${f1(sunX)}" cy="${f1(sunY)}" r="${sunR * 3}" fill="url(#${id}g)"/><circle cx="${f1(sunX)}" cy="${f1(sunY)}" r="${sunR}" fill="${M.sun}"/>`;
  for (let i = 0; i < clouds; i++) s += cloud(r.range(60, 1140), r.range(70, 300), r.range(0.6, 1.4), mix(M.light, M.sky[1], 0.25), r);
  if (birds) for (let i = 0, n = r.int(0, 5); i < n; i++) {
    const x = r.range(150, 1050), y = r.range(90, 300), w = r.range(9, 16);
    s += `<path d="M${f1(x - w)} ${f1(y - w * .45)}Q${f1(x - w * .45)} ${f1(y - w * .55)} ${f1(x)} ${f1(y)}Q${f1(x + w * .45)} ${f1(y - w * .55)} ${f1(x + w)} ${f1(y - w * .45)}" fill="none" stroke="${M.shade}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  }
  return s;
}
export function cloud(x, y, s, col, r) {
  const n = r.int(3, 5), parts = [];
  for (let i = 0; i < n; i++) parts.push(`<ellipse cx="${f1(x + (i - n / 2) * 34 * s)}" cy="${f1(y - Math.sin((i / (n - 1 || 1)) * Math.PI) * 18 * s)}" rx="${f1(r.range(34, 52) * s)}" ry="${f1(r.range(18, 28) * s)}"/>`);
  return `<g fill="${col}" opacity=".85">${parts.join('')}<rect x="${f1(x - n * 22 * s)}" y="${f1(y)}" width="${f1(n * 44 * s)}" height="${f1(14 * s)}" rx="${f1(7 * s)}"/></g>`;
}
export function mistBand(y, h, M, op = 0.55) {
  return `<rect x="-20" y="${f1(y)}" width="${W + 40}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${M.light}" opacity="${op}"/>`;
}

// ---------- water ----------
export function water(M, r, { y, sunX = null, tint = null, ripples = 14 }) {
  const id = 'wt' + uid++;
  const top = tint ? mix(M.water[0], tint, 0.5) : M.water[0], bot = tint ? mix(M.water[1], tint, 0.5) : M.water[1];
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect x="-10" y="${f1(y)}" width="${W + 20}" height="${f1(H - y + 10)}" fill="url(#${id})"/>`;
  if (sunX !== null && M.sun) for (let i = 0; i < 7; i++) {
    const yy = y + 14 + i * 22, w = 120 - i * 12;
    s += `<rect x="${f1(sunX - w / 2 + r.range(-10, 10))}" y="${f1(yy)}" width="${f1(w)}" height="6" rx="3" fill="${M.sun}" opacity="${f1(0.55 - i * 0.06)}"/>`;
  }
  for (let i = 0; i < ripples; i++) {
    const yy = r.range(y + 20, H - 20), w = r.range(30, 110) * (0.5 + (yy - y) / (H - y));
    s += `<rect x="${f1(r.range(0, W))}" y="${f1(yy)}" width="${f1(w)}" height="${f1(2 + (yy - y) / 120)}" rx="2" fill="${M.light}" opacity=".35"/>`;
  }
  return s;
}
export function waves(M, r, y, rows = 4) {
  let s = '';
  for (let i = 0; i < rows; i++) {
    const yy = y + i * (30 + i * 12), amp = 6 + i * 3, pts = [];
    for (let x = -40; x <= W + 40; x += 60) pts.push([x, yy + Math.sin(x / 47 + i * 1.7) * amp]);
    s += `<path d="${smooth(pts)}" fill="none" stroke="${M.light}" stroke-width="${3 + i}" stroke-linecap="round" opacity="${0.55 - i * 0.08}"/>`;
  }
  return s;
}

// ---------- vegetation ----------
export function canopyRow(r, { y, h = 60, col, x0 = -40, x1 = W + 40, gap = 0.75 }) {
  let s = `<g fill="${col}">`;
  for (let x = x0; x < x1;) {
    const rr = r.range(h * 0.45, h * 0.85);
    s += `<circle cx="${f1(x)}" cy="${f1(y - rr * 0.6 - r.range(0, h * 0.25))}" r="${f1(rr)}"/>`;
    x += rr * gap * 2;
  }
  return s + `<rect x="${x0}" y="${f1(y - h * 0.35)}" width="${x1 - x0}" height="${f1(h * 0.35 + 30)}"/></g>`;
}
export function palm(x, y, h, col, r, lean = null) {
  lean ??= r.range(-0.25, 0.25);
  const tx = x + lean * h, ty = y - h;
  let s = `<path d="M${f1(x - 5)} ${f1(y)}Q${f1(x + lean * h * 0.3)} ${f1(y - h * 0.5)} ${f1(tx)} ${f1(ty)}L${f1(tx + 6)} ${f1(ty + 4)}Q${f1(x + lean * h * 0.3 + 8)} ${f1(y - h * 0.5)} ${f1(x + 6)} ${f1(y)}Z" fill="${col}"/>`;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI + r.range(-0.15, 0.15), L = h * r.range(0.32, 0.45);
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + L * 0.35;
    const mx = tx + Math.cos(a) * L * 0.55, my = ty + Math.sin(a) * L * 0.55 - 6;
    s += `<path d="M${f1(tx)} ${f1(ty)}Q${f1(mx)} ${f1(my - 10)} ${f1(ex)} ${f1(ey)}Q${f1(mx)} ${f1(my + 6)} ${f1(tx)} ${f1(ty + 4)}Z" fill="${col}"/>`;
  }
  return s;
}
export function betelPalm(x, y, h, col) {
  return `<rect x="${f1(x - 2.5)}" y="${f1(y - h)}" width="5" height="${f1(h)}" fill="${col}"/>` +
    [0, 1, 2, 3, 4].map((i) => `<path d="M${f1(x)} ${f1(y - h)}q${f1((i - 2) * 14)} ${f1(-10 + Math.abs(i - 2) * 6)} ${f1((i - 2) * 26)} ${f1(10 + Math.abs(i - 2) * 6)}" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('');
}
export function roundTree(x, y, h, col, r, trunk = null) {
  const cr = h * r.range(0.32, 0.4);
  return `<rect x="${f1(x - h * 0.03)}" y="${f1(y - h * 0.55)}" width="${f1(h * 0.06)}" height="${f1(h * 0.55)}" fill="${trunk ?? mix(col, '#000', 0.35)}"/>` +
    `<g fill="${col}"><circle cx="${f1(x)}" cy="${f1(y - h + cr)}" r="${f1(cr)}"/><circle cx="${f1(x - cr * 0.7)}" cy="${f1(y - h + cr * 1.6)}" r="${f1(cr * 0.8)}"/><circle cx="${f1(x + cr * 0.75)}" cy="${f1(y - h + cr * 1.55)}" r="${f1(cr * 0.82)}"/></g>`;
}
export function pine(x, y, h, col) { // casuarina / jhau
  return `<path d="M${f1(x)} ${f1(y - h)}L${f1(x + h * 0.16)} ${f1(y - h * 0.15)}L${f1(x - h * 0.16)} ${f1(y - h * 0.15)}Z" fill="${col}"/><rect x="${f1(x - 2)}" y="${f1(y - h * 0.16)}" width="4" height="${f1(h * 0.16)}" fill="${mix(col, '#000', 0.3)}"/>`;
}
export function banyan(x, y, h, col, r) {
  let s = `<path d="M${f1(x - h * 0.08)} ${f1(y)}Q${f1(x - h * 0.04)} ${f1(y - h * 0.4)} ${f1(x - h * 0.2)} ${f1(y - h * 0.6)}L${f1(x + h * 0.2)} ${f1(y - h * 0.6)}Q${f1(x + h * 0.04)} ${f1(y - h * 0.4)} ${f1(x + h * 0.08)} ${f1(y)}Z" fill="${mix(col, '#3A2A1E', 0.6)}"/>`;
  for (let i = 0; i < 9; i++) { const xx = x + r.range(-h * 0.7, h * 0.7); s += `<rect x="${f1(xx)}" y="${f1(y - h * 0.55)}" width="2.5" height="${f1(h * 0.55)}" fill="${mix(col, '#3A2A1E', 0.5)}" opacity=".8"/>`; }
  s += `<g fill="${col}">`;
  for (let i = 0; i < 9; i++) s += `<ellipse cx="${f1(x + r.range(-h * 0.75, h * 0.75))}" cy="${f1(y - h * r.range(0.62, 0.92))}" rx="${f1(h * r.range(0.22, 0.34))}" ry="${f1(h * r.range(0.14, 0.2))}"/>`;
  return s + '</g>';
}
export function grassTufts(r, M, y, n = 18, col = null) {
  let s = `<g stroke="${col ?? mix(M.green[2], '#000', 0.15)}" stroke-width="3" stroke-linecap="round" fill="none">`;
  for (let i = 0; i < n; i++) {
    const x = r.range(0, W), yy = y + r.range(0, H - y - 10), h = r.range(10, 22);
    s += `<path d="M${f1(x)} ${f1(yy)}l-5 -${f1(h)}M${f1(x)} ${f1(yy)}l1 -${f1(h * 1.2)}M${f1(x)} ${f1(yy)}l6 -${f1(h)}"/>`;
  }
  return s + '</g>';
}

// ---------- boats & small things ----------
export function boat(x, y, s, M, r, { sail = r() < 0.5, roof = !sail && r() < 0.6, col = null } = {}) {
  const hull = col ?? mix(M.shade, '#3A2414', 0.45);
  let g = `<path d="M${f1(x - 70 * s)} ${f1(y - 14 * s)}Q${f1(x)} ${f1(y + 18 * s)} ${f1(x + 70 * s)} ${f1(y - 14 * s)}Q${f1(x)} ${f1(y + 2 * s)} ${f1(x - 70 * s)} ${f1(y - 14 * s)}Z" fill="${hull}"/>`;
  if (roof) g += `<path d="M${f1(x - 28 * s)} ${f1(y - 4 * s)}Q${f1(x)} ${f1(y - 38 * s)} ${f1(x + 28 * s)} ${f1(y - 4 * s)}Z" fill="${mix(hull, '#C9A06A', 0.5)}"/>`;
  if (sail) g += `<path d="M${f1(x - 4 * s)} ${f1(y - 6 * s)}V${f1(y - 96 * s)}" stroke="${hull}" stroke-width="${f1(3 * s)}"/><path d="M${f1(x - 2 * s)} ${f1(y - 92 * s)}L${f1(x + 46 * s)} ${f1(y - 20 * s)}L${f1(x - 2 * s)} ${f1(y - 16 * s)}Z" fill="${r.pick(['#F5EBDD', '#E8C17A', '#D97A5A', '#EDE3CF'])}"/>`;
  g += `<path d="M${f1(x + 40 * s)} ${f1(y - 14 * s)}v-${f1(26 * s)}" stroke="${hull}" stroke-width="${f1(4 * s)}" stroke-linecap="round"/><circle cx="${f1(x + 40 * s)}" cy="${f1(y - 46 * s)}" r="${f1(6 * s)}" fill="${hull}"/>`;
  return g + `<ellipse cx="${f1(x)}" cy="${f1(y + 6 * s)}" rx="${f1(80 * s)}" ry="${f1(5 * s)}" fill="${M.light}" opacity=".25"/>`;
}
export function ship(x, y, s, col) {
  return `<path d="M${f1(x - 60 * s)} ${f1(y)}h${f1(120 * s)}l-${f1(14 * s)} ${f1(14 * s)}h-${f1(92 * s)}z" fill="${col}"/><rect x="${f1(x - 30 * s)}" y="${f1(y - 18 * s)}" width="${f1(40 * s)}" height="${f1(18 * s)}" fill="${col}"/><rect x="${f1(x - 18 * s)}" y="${f1(y - 34 * s)}" width="${f1(10 * s)}" height="${f1(16 * s)}" fill="${col}"/>`;
}
export function lilies(r, M, y0, n, flower = '#F28AA6') {
  let s = '';
  for (let i = 0; i < n; i++) {
    const y = r.range(y0, H - 10), k = 0.5 + (y - y0) / (H - y0), x = r.range(0, W), rx = 26 * k, ry = 9 * k;
    s += `<path d="M${f1(x)} ${f1(y)}m-${f1(rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(rx * 2)} 0a${f1(rx)} ${f1(ry)} 0 0 0 -${f1(rx * 0.9)} -${f1(ry * 0.9)}L${f1(x)} ${f1(y)}Z" fill="${mix(M.green[1], '#2E7D4F', 0.4)}"/>`;
    if (r() < 0.45) s += `<g fill="${flower}"><ellipse cx="${f1(x)}" cy="${f1(y - 10 * k)}" rx="${f1(5 * k)}" ry="${f1(12 * k)}"/><ellipse cx="${f1(x - 8 * k)}" cy="${f1(y - 7 * k)}" rx="${f1(4 * k)}" ry="${f1(10 * k)}" transform="rotate(-30 ${f1(x - 8 * k)} ${f1(y - 7 * k)})"/><ellipse cx="${f1(x + 8 * k)}" cy="${f1(y - 7 * k)}" rx="${f1(4 * k)}" ry="${f1(10 * k)}" transform="rotate(30 ${f1(x + 8 * k)} ${f1(y - 7 * k)})"/></g>`;
  }
  return s;
}
export function deer(x, y, s, col) {
  return `<g fill="${col}"><ellipse cx="${f1(x)}" cy="${f1(y - 30 * s)}" rx="${f1(26 * s)}" ry="${f1(12 * s)}"/><rect x="${f1(x - 20 * s)}" y="${f1(y - 24 * s)}" width="${f1(4 * s)}" height="${f1(24 * s)}"/><rect x="${f1(x + 16 * s)}" y="${f1(y - 24 * s)}" width="${f1(4 * s)}" height="${f1(24 * s)}"/><path d="M${f1(x + 20 * s)} ${f1(y - 34 * s)}l${f1(12 * s)} -${f1(24 * s)}l${f1(10 * s)} ${f1(4 * s)}l-${f1(8 * s)} ${f1(20 * s)}z"/></g><path d="M${f1(x + 36 * s)} ${f1(y - 58 * s)}l${f1(-6 * s)} ${f1(-16 * s)}M${f1(x + 36 * s)} ${f1(y - 58 * s)}l${f1(8 * s)} ${f1(-14 * s)}" stroke="${col}" stroke-width="${f1(2.5 * s)}" fill="none"/>`;
}
export function person(x, y, s, col) {
  return `<g fill="${col}"><circle cx="${f1(x)}" cy="${f1(y - 34 * s)}" r="${f1(5 * s)}"/><path d="M${f1(x - 6 * s)} ${f1(y - 27 * s)}h${f1(12 * s)}l${f1(3 * s)} ${f1(27 * s)}h${f1(-18 * s)}z"/></g>`;
}
export function grain(op = 0.08) {
  const id = 'gr' + uid++;
  return `<filter id="${id}" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${op} 0"/></filter><rect width="${W}" height="${H}" filter="url(#${id})"/>`;
}
export function vignette() {
  const id = 'vg' + uid++;
  return `<defs><radialGradient id="${id}" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
}
export { rng, mix, f1 };
