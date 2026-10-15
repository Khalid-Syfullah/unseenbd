// Unseen BD brand: mark, lockups, favicons, PWA icons, social images, manifest.
import fs from 'node:fs';
import path from 'node:path';
import pngToIco from 'png-to-ico';
import { C, OUT, write, savePng, renderPng, textPath, svgDoc, rng, read } from './lib.mjs';

// ---------- the mark: an eye that holds a Bangladeshi sunset over a river ----------
const EYE = 'M84 256C148 146 364 146 428 256C364 366 148 366 84 256Z';
function eyeArt({ outline = null } = {}) {
  return `
  <defs>
    <clipPath id="eye"><path d="${EYE}"/></clipPath>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B97B8"/><stop offset="1" stop-color="#1E6E8E"/></linearGradient>
  </defs>
  <path d="${EYE}" fill="${C.paper}"${outline ? ` stroke="${outline}" stroke-width="18" stroke-linejoin="round"` : ''}/>
  <g clip-path="url(#eye)">
    <path d="M60 282C120 250 170 238 214 262C232 272 246 280 262 282H470V420H60Z" fill="${C.leaf}" opacity=".9"/>
    <circle cx="256" cy="250" r="64" fill="${C.sun}"/>
    <rect x="60" y="282" width="420" height="140" fill="url(#water)"/>
    <path d="M150 312h70M262 312h104M196 338h88" stroke="${C.paper}" stroke-width="11" stroke-linecap="round" opacity=".9"/>
  </g>`;
}
const markSvg = (size = 512, rx = 116) => svgDoc(512, 512, `
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#138060"/><stop offset="1" stop-color="#0A503C"/></linearGradient></defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>${eyeArt()}`, ` role="img" aria-label="Unseen BD"`).replace(/width="512" height="512"/, `width="${size}" height="${size}"`);

// Maskable: full-bleed background, eye kept inside the 80% safe zone
const maskableSvg = () => svgDoc(512, 512, `
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#138060"/><stop offset="1" stop-color="#0A503C"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#bg)"/><g transform="translate(256 256) scale(.78) translate(-256 -256)">${eyeArt()}</g>`);

// Small sizes: fewer details so it stays readable at 16 px
const faviconSvg = () => svgDoc(32, 32, `
  <rect width="32" height="32" rx="7" fill="${C.forest}"/>
  <clipPath id="e"><path d="M4 16C8.5 8.6 23.5 8.6 28 16C23.5 23.4 8.5 23.4 4 16Z"/></clipPath>
  <path d="M4 16C8.5 8.6 23.5 8.6 28 16C23.5 23.4 8.5 23.4 4 16Z" fill="${C.paper}"/>
  <g clip-path="url(#e)"><circle cx="16" cy="15.4" r="4.6" fill="${C.sun}"/><rect x="2" y="17.4" width="28" height="9" fill="${C.river}"/></g>`,
  ' role="img" aria-label="Unseen BD"');

const eyeGlyph = (outline) => svgDoc(512, 512, eyeArt({ outline }), ' role="img" aria-label="Unseen BD"').replace('viewBox="0 0 512 512"', 'viewBox="60 120 392 272"').replace('width="512" height="512"', 'width="392" height="272"');
const eyeMono = () => svgDoc(392, 272, `<g transform="translate(-60 -120)" fill="currentColor"><path fill-rule="evenodd" d="${EYE}M256 186a64 64 0 1 0 0.1 0Z"/></g>`, ' role="img" aria-label="Unseen BD"');

// ---------- wordmark & lockups ----------
function wordmark({ x, y, size, dark = false, anchor = 'start' }) {
  const a = textPath('Unseen ', { font: 'serif', size, x: 0, y: 0 });
  const b = textPath('BD', { font: 'serif', size, x: 0, y: 0 });
  const total = a.width + b.width;
  const x0 = anchor === 'middle' ? x - total / 2 : x;
  const A = textPath('Unseen ', { font: 'serif', size, x: x0, y });
  const B = textPath('BD', { font: 'serif', size, x: x0 + a.width, y });
  return { svg: `<path d="${A.d}" fill="${dark ? C.paper : C.ink}"/><path d="${B.d}" fill="${dark ? '#FF6F5E' : C.sun}"/>`, width: total };
}
const TAG = { en: 'Explore all 64 districts', bn: '৬৪ জেলা ঘুরে দেখুন' };

function horizontal({ dark = false, lang = 'en', tagline = true }) {
  const H = 160, mark = 128, gap = 30, ws = 86;
  const wm = wordmark({ x: mark + gap + 8, y: tagline ? 92 : 108, size: ws, dark });
  const tg = tagline ? textPath(TAG[lang], { font: 'sansSemi', size: lang === 'bn' ? 30 : 27, x: mark + gap + 12, y: 138 }) : null;
  const W = Math.ceil(mark + gap + 8 + Math.max(wm.width, tg ? tg.width : 0) + 16);
  const body = `<g transform="translate(0 ${(H - mark) / 2}) scale(${mark / 512})">${markSvg().replace(/^<svg[^>]*>|<\/svg>\n?$/g, '')}</g>${wm.svg}` +
    (tg ? `<path d="${tg.d}" fill="${dark ? C.mist : '#5B6475'}"/>` : '');
  return svgDoc(W, H, body, ' role="img" aria-label="Unseen BD"');
}
function stacked({ dark = false, lang = 'en' }) {
  const W = 520, mark = 200;
  const wm = wordmark({ x: W / 2, y: mark + 116, size: 96, dark, anchor: 'middle' });
  const tg = textPath(TAG[lang], { font: 'sansSemi', size: lang === 'bn' ? 34 : 30, x: W / 2, y: mark + 170, anchor: 'middle' });
  const body = `<g transform="translate(${(W - mark) / 2} 0) scale(${mark / 512})">${markSvg().replace(/^<svg[^>]*>|<\/svg>\n?$/g, '')}</g>${wm.svg}<path d="${tg.d}" fill="${dark ? C.mist : '#5B6475'}"/>`;
  return svgDoc(W, mark + 190, body, ' role="img" aria-label="Unseen BD"');
}
function wordmarkOnly(dark) {
  const wm = wordmark({ x: 4, y: 92, size: 100, dark });
  return svgDoc(Math.ceil(wm.width + 10), 120, wm.svg, ' role="img" aria-label="Unseen BD"');
}

// gradient ids must be unique when several marks share one document
const uniq = (svg, tag) => svg.replace(/id="(bg|eye|water)"/g, `id="$1-${tag}"`).replace(/url\(#(bg|eye|water)\)/g, `url(#$1-${tag})`);

write('brand/logo-mark.svg', markSvg());
write('brand/logo-mark-maskable.svg', maskableSvg());
write('brand/logo-eye.svg', eyeGlyph(C.forest));
write('brand/logo-eye-mono.svg', eyeMono());
write('brand/favicon.svg', faviconSvg());
write('brand/wordmark.svg', wordmarkOnly(false));
write('brand/wordmark-dark.svg', wordmarkOnly(true));
for (const lang of ['en', 'bn']) {
  write(`brand/logo-horizontal-${lang}.svg`, uniq(horizontal({ lang }), 'h'));
  write(`brand/logo-horizontal-${lang}-dark.svg`, uniq(horizontal({ lang, dark: true }), 'h'));
  write(`brand/logo-stacked-${lang}.svg`, uniq(stacked({ lang }), 's'));
  write(`brand/logo-stacked-${lang}-dark.svg`, uniq(stacked({ lang, dark: true }), 's'));
}
write('brand/logo-horizontal.svg', uniq(horizontal({ tagline: false }), 'h'));
write('brand/logo-horizontal-dark.svg', uniq(horizontal({ tagline: false, dark: true }), 'h'));

// ---------- raster icons ----------
const fav = faviconSvg(), mark = markSvg();
const icons = [['favicon-16.png', fav, 16], ['favicon-32.png', fav, 32], ['favicon-48.png', mark, 48],
  ['icon-192.png', mark, 192], ['icon-512.png', mark, 512], ['icon-maskable-192.png', maskableSvg(), 192], ['icon-maskable-512.png', maskableSvg(), 512]];
for (const [f, svg, w] of icons) await savePng(svg, `brand/${f}`, w);
// Apple touch icon: square, no transparency (iOS rounds the corners itself)
await savePng(maskableSvg().replace('scale(.78)', 'scale(.86)'), 'brand/apple-touch-icon.png', 180);
fs.writeFileSync(path.join(OUT, 'brand/favicon.ico'), await pngToIco([16, 32, 48].map((w) => renderPng(w < 48 ? fav : mark, w))));

// ---------- social images ----------
const bd = JSON.parse(fs.readFileSync(path.join(OUT, 'maps/bangladesh.json'), 'utf8'));
function mapArt({ x, y, h, seed, dark }) {
  const s = h / 760, r = rng(seed);
  const tones = [C.forest, C.leaf, C.marigold, C.forest, C.leaf, C.river];
  const paths = bd.districts.map((d) => {
    const on = r() < 0.34;
    return `<path d="${d.d}" fill="${on ? r.pick(tones) : dark ? '#1C2747' : '#EADFC8'}" stroke="${dark ? C.night : C.paper}" stroke-width="1.2"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">${paths}</g>`;
}
function wrap(text, opts, maxW) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textPath(t, opts).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
const HEAD = {
  en: 'Travel guide, map and trip planner for all 64 districts of Bangladesh',
  bn: 'বাংলাদেশের ৬৪ জেলার ভ্রমণ গাইড, মানচিত্র আর ট্রিপ প্ল্যানার',
};
const stats = read('stats.json');
const bnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const CHIPS = {
  en: [`${stats.places} places`, `${stats.routes_detailed} routes`, `${stats.trains} trains`],
  bn: [`${bnNum(stats.places)}টি জায়গা`, `${bnNum(stats.routes_detailed)}টি রুট`, `${bnNum(stats.trains)}টি ট্রেন`],
};
function ogSvg(lang, { W = 1200, H = 630, dark = false } = {}) {
  const fg = dark ? C.paper : C.ink;
  const mk = uniq(markSvg(), 'og').replace(/^<svg[^>]*>|<\/svg>\n?$/g, '');
  const wm = wordmark({ x: 176, y: 152, size: 84, dark });
  const headOpts = { font: 'sansBold', size: lang === 'bn' ? 46 : 44 };
  const lines = wrap(HEAD[lang], headOpts, 600);
  const head = lines.map((l, i) => `<path d="${textPath(l, { ...headOpts, x: 72, y: 262 + i * 60 }).d}" fill="${fg}"/>`).join('');
  let cx = 72;
  const chips = CHIPS[lang].map((c) => {
    const t = textPath(c, { font: 'sansSemi', size: 26, x: 0, y: 0 });
    const w = t.width + 40, g = `<rect x="${cx}" y="${H - 132}" width="${w}" height="52" rx="26" fill="${dark ? '#1C2747' : '#fff'}" stroke="${dark ? '#2C3A63' : '#E5DAC4'}"/><path d="${textPath(c, { font: 'sansSemi', size: 26, x: cx + 20, y: H - 97 }).d}" fill="${dark ? C.mist : C.forest}"/>`;
    cx += w + 14;
    return g;
  }).join('');
  return svgDoc(W, H, `
    <defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark ? '#121A36' : '#FDF9F1'}"/><stop offset="1" stop-color="${dark ? C.night : '#F3E8D2'}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#paper)"/>
    <circle cx="${W - 190}" cy="150" r="230" fill="${C.marigold}" opacity="${dark ? 0.12 : 0.18}"/>
    ${mapArt({ x: W - 470, y: 26, h: H - 52, seed: 'og-' + lang, dark })}
    <g transform="translate(72 80) scale(${88 / 512})">${mk}</g>${wm.svg}${head}${chips}`);
}
for (const lang of ['en', 'bn']) {
  await savePng(ogSvg(lang), `social/og-default-${lang}.png`, 1200);
  await savePng(ogSvg(lang, { dark: true }), `social/og-default-${lang}-dark.png`, 1200);
}
await savePng(maskableSvg(), 'social/avatar-400.png', 400);
// Cover / header banner (1500×500, X/Twitter; also fine for a Facebook cover crop)
const cover = (lang) => svgDoc(1500, 500, `
  <rect width="1500" height="500" fill="${C.forest}"/>
  <circle cx="1220" cy="120" r="260" fill="${C.marigold}" opacity=".16"/>
  ${mapArt({ x: 1080, y: 20, h: 460, seed: 'cover', dark: true }).replace(/#1C2747/g, '#13785A').replace(new RegExp(C.night, 'g'), C.forest)}
  ${(() => { const w = wordmark({ x: 120, y: 250, size: 120, dark: true }); return w.svg; })()}
  <path d="${textPath(lang === 'en' ? HEAD.en : HEAD.bn, { font: 'sansSemi', size: 34, x: 124, y: 320 }).d}" fill="${C.mist}"/>`);
await savePng(cover('en'), 'social/cover-1500x500-en.png', 1500);
await savePng(cover('bn'), 'social/cover-1500x500-bn.png', 1500);

// ---------- manifest ----------
write('brand/manifest.webmanifest', JSON.stringify({
  name: 'Unseen BD', short_name: 'Unseen BD', lang: 'bn', dir: 'ltr', start_url: '/', scope: '/', display: 'standalone',
  description: 'Travel guide, map and trip planner for all 64 districts of Bangladesh',
  background_color: C.paper, theme_color: C.forest,
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
}, null, 2) + '\n');
console.log('brand done');
