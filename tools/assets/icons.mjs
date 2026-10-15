// Icons (place types, UI, games), illustrations, passport stamps, level badges, card themes.
import fs from 'node:fs';
import path from 'node:path';
import { C, OUT, write, textPath, fitText, svgDoc, read, rng, mix, esc, DIVISION_COLORS } from './lib.mjs';

// ---------- stroke icon set (24×24 grid, 2px round strokes, currentColor) ----------
const icon = (body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${esc(label)}">${body}</svg>\n`;

export const KIND_ICONS = {
  beach: ['Beach', '<path d="M3 20c2 1.3 4 1.3 6 0s4-1.3 6 0 4 1.3 6 0"/><path d="M12 16V7"/><path d="M4 9a8 8 0 0 1 16 0z"/><path d="M12 3v1"/>'],
  island: ['Island', '<path d="M2 20c2.5 1.2 5 1.2 7.5 0s5-1.2 7.5 0 3.5.8 5 .4"/><path d="M5 17c2-2.6 9-2.6 13 0"/><path d="M11 15.5c0-4 .5-7 2-9"/><path d="M13 6.5c-2-1.6-4.6-1.4-6 .5M13 6.5c1.3-2 4-2.4 6-1M13 6.5c2.4-.3 4.4 1 5 3"/>'],
  hill: ['Hill', '<path d="M2 20l6.5-10 4 5.5L16 11l6 9z"/><path d="M8.5 10l2 3"/><circle cx="18" cy="5" r="2"/>'],
  waterfall: ['Waterfall', '<path d="M3 21V6h9"/><path d="M12 6c3 0 4.5 2 4.5 5v6"/><path d="M12 9.5c1.6 0 2 1.2 2 2.8V17"/><path d="M8 20.5c1.4-.9 2.8-.9 4.2 0s2.8.9 4.2 0 2.8-.9 4.2 0"/>'],
  forest: ['Forest', '<path d="M7 21v-4M7 3l-4 7h2.5L3 14h8l-2.5-4H11z"/><path d="M17 21v-5"/><circle cx="17" cy="11.5" r="4.5"/>'],
  river: ['River & haor', '<path d="M2 18c2 1.2 4 1.2 6 0s4-1.2 6 0 4 1.2 6 0"/><path d="M4 13h16l-2.5 3h-11z"/><path d="M12 13V4l5 7"/>'],
  tea: ['Tea garden', '<path d="M12 21v-6"/><path d="M12 15c-5 0-8-3-8-8 5 0 8 3 8 8z"/><path d="M12 15c0-5 3-8 8-8 0 5-3 8-8 8z"/><path d="M12 9c-1-2-1-4 0-6 1 2 1 4 0 6z"/>'],
  heritage: ['Heritage', '<path d="M3 21h18"/><path d="M4 21V8l2-1 2 1v13M16 21V8l2-1 2 1v13"/><path d="M8 21v-9h8v9"/><path d="M10 21v-3a2 2 0 0 1 4 0v3"/><path d="M4 8V5M8 8V5M16 8V5M20 8V5"/>'],
  spiritual: ['Religious site', '<path d="M3 21h18"/><path d="M5 21v-7h14v7"/><path d="M7 14a5 5 0 0 1 10 0"/><path d="M12 9V5"/><circle cx="12" cy="3.6" r="1"/><path d="M10 21v-3a2 2 0 0 1 4 0v3"/>'],
  city: ['City & park', '<path d="M3 21h18"/><path d="M5 21V10h5v11M10 21V4h6v17M16 21v-8h4v8"/><path d="M12.5 7h1M12.5 10h1M12.5 13h1M7 13h1M7 16h1"/>'],
  village: ['Village', '<path d="M3 21h18"/><path d="M4 12l6-6 6 6"/><path d="M5.5 11v10h9V11"/><path d="M8.5 21v-4h3v4"/><path d="M19 21v-9M19 12c-1.6-1-2-2.6-1.4-4M19 14c1.6-1 2-2.6 1.4-4M19 16.5c-1.4-.6-2-1.8-1.6-3"/>'],
};

const UI_ICONS = {
  home: ['Home', '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'],
  'my-map': ['My Bangladesh', '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'],
  explore: ['Explore', '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'],
  planner: ['Planner', '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>'],
  gallery: ['Gallery', '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'],
  world: ['My world', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'],
  search: ['Search', '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'],
  menu: ['Menu', '<path d="M4 7h16M4 12h16M4 17h16"/>'],
  close: ['Close', '<path d="M6 6l12 12M18 6L6 18"/>'],
  sun: ['Light theme', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
  moon: ['Dark theme', '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'],
  language: ['Language', '<path d="M4 5h8M8 3v2M6 5c0 4 2.5 7 6 8M10 5c-.5 3.5-2.8 6.5-6 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/>'],
  user: ['Profile', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
  heart: ['Like', '<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-2.3A4.6 4.6 0 0 1 21 11c-2 4.6-9 9-9 9z"/>'],
  upvote: ['Vote up', '<path d="M12 4l7 9h-4v7H9v-7H5z"/>'],
  star: ['Rating', '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'],
  share: ['Share', '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/>'],
  comment: ['Comments', '<path d="M4 5h16v11H9l-5 4z"/>'],
  bookmark: ['Want to go', '<path d="M6 3h12v18l-6-4-6 4z"/>'],
  check: ['Been there', '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'],
  pin: ['Location', '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'],
  directions: ['Directions', '<path d="M12 2l10 10-10 10L2 12z"/><path d="M9 14v-2a2 2 0 0 1 2-2h5M14 7.5l2.5 2.5-2.5 2.5"/>'],
  calendar: ['Best months', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
  clock: ['Time needed', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  bus: ['Bus', '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>'],
  train: ['Train', '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="13.5" r=".6"/><circle cx="15" cy="13.5" r=".6"/>'],
  launch: ['Launch', '<path d="M3 16h18l-2.5 4h-13z"/><path d="M6 16V9h12v7M9 9V6h6v3"/><path d="M9 12h1M14 12h1"/>'],
  plane: ['Flight', '<path d="M10.5 4.5c0-1 .7-2 1.5-2s1.5 1 1.5 2V9l7 4v2l-7-2v4l2 1.5V20l-3.5-1-3.5 1v-1.5l2-1.5v-4l-7 2v-2l7-4z"/>'],
  car: ['Car', '<path d="M3 16v-4l2-5h14l2 5v4z"/><path d="M3 12h18"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/>'],
  bed: ['Stay', '<path d="M3 19V6M3 15h18v4"/><path d="M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>'],
  food: ['Food', '<circle cx="12" cy="13" r="5.5"/><circle cx="12" cy="13" r="2.5"/><path d="M3.5 3v5a2 2 0 0 0 2 2M5.5 3v18M20.5 3c-1.7 1-2.5 3-2.5 5.5s.8 3.5 2.5 3.5v9"/>'],
  shopping: ['Shopping', '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'],
  wallet: ['Cost', '<path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11v3"/><path d="M16 13.5h2"/>'],
  users: ['Travellers', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>'],
  camera: ['Add photo', '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>'],
  upload: ['Upload', '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'],
  trophy: ['Leaderboard', '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 21h8M9.5 17h5v4h-5z"/>'],
  quiz: ['Quiz', '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17" r=".6"/>'],
  phone: ['Call', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'],
  shield: ['Safety', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'],
  passport: ['Passport', '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3.5"/><path d="M9 17h6"/>'],
  offline: ['Keep offline', '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 20h14"/>'],
  printer: ['Print', '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'],
  speaker: ['Listen', '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'],
  filter: ['Filter', '<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>'],
  plus: ['Add', '<path d="M12 5v14M5 12h14"/>'],
  minus: ['Remove', '<path d="M5 12h14"/>'],
  'arrow-right': ['Next', '<path d="M5 12h14M13 6l6 6-6 6"/>'],
  'arrow-left': ['Back', '<path d="M19 12H5M11 6l-6 6 6 6"/>'],
  external: ['Opens in new tab', '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'],
  copy: ['Copy', '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>'],
  flag: ['Report', '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'],
  facebook: ['Facebook', '<path d="M14 21v-8h3l.5-3.5H14V7.5c0-1 .3-1.7 1.8-1.7h1.8V2.7c-.3 0-1.4-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.5v2.5H7.5V13h3.1v8"/>'],
  whatsapp: ['WhatsApp', '<path d="M4 20l1.2-4A8.5 8.5 0 1 1 8 19z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z"/>'],
  emergency: ['Emergency', '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.2v.1"/>'],
};

for (const [k, [label, body]] of Object.entries(KIND_ICONS)) write(`icons/kinds/${k}.svg`, icon(body, label));
for (const [k, [label, body]] of Object.entries(UI_ICONS)) write(`icons/ui/${k}.svg`, icon(body, label));

// Filled badge versions of the place types (for map markers, chips and legends)
export const KIND_COLORS = {
  beach: '#E9A23B', island: '#22A39A', hill: '#3E8E5E', waterfall: '#2F86B8', forest: '#2F7A3F', river: '#2D74A6',
  tea: '#5BA34A', heritage: '#B5653C', spiritual: '#8C62B5', city: '#5A6AA8', village: '#C2873A',
};
for (const [k, [label, body]] of Object.entries(KIND_ICONS)) {
  write(`icons/kinds-badge/${k}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${esc(label)}"><circle cx="24" cy="24" r="23" fill="${KIND_COLORS[k]}"/><g transform="translate(12 12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`);
  // Map pin marker
  write(`icons/markers/${k}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52" role="img" aria-label="${esc(label)}"><path d="M20 51C20 51 2 32.5 2 20a18 18 0 0 1 36 0c0 12.5-18 31-18 31z" fill="${KIND_COLORS[k]}" stroke="#fff" stroke-width="2.5"/><g transform="translate(9.5 9.5) scale(.875)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`);
}

// ---------- game & quiz icons (64×64 duotone) ----------
const duo = (body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${esc(label)}">${body}</svg>\n`;
const bd = JSON.parse(fs.readFileSync(path.join(OUT, 'maps/bangladesh.json'), 'utf8'));
const silhouette = (slug) => bd.districts.find((d) => d.slug === slug);
function fitPath(d, bbox, x, y, w, h) {
  const [x0, y0, x1, y1] = bbox, s = Math.min(w / (x1 - x0), h / (y1 - y0));
  const ox = x + (w - (x1 - x0) * s) / 2 - x0 * s, oy = y + (h - (y1 - y0) * s) / 2 - y0 * s;
  return `<path transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${s.toFixed(4)})" d="${d}"`;
}
const country = bd.divisions.map((v) => v.d).join('');
const GAMES = {
  'ten-question-sprint': ['Ten-question sprint', `<circle cx="32" cy="35" r="24" fill="${C.marigold}"/><circle cx="32" cy="35" r="18" fill="${C.paper}"/><path d="M32 23v12l8 5" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M26 6h12M32 6v5M50 14l4-4" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`],
  'photo-clue': ['Photo clue', `<rect x="6" y="14" width="52" height="40" rx="8" fill="${C.river}"/><rect x="22" y="8" width="20" height="10" rx="3" fill="${C.river}"/>${fitPath(silhouette('sylhet').d, silhouette('sylhet').bbox, 16, 21, 32, 27)} fill="${C.paper}"/><circle cx="49" cy="22" r="3" fill="${C.marigold}"/>`],
  'memory-pairs': ['Memory pairs', `<g transform="rotate(-10 20 32)"><rect x="6" y="12" width="28" height="40" rx="6" fill="${C.forest}"/>${fitPath(silhouette('dhaka').d, silhouette('dhaka').bbox, 10, 20, 20, 24)} fill="${C.paper}"/></g><g transform="rotate(8 44 32)"><rect x="30" y="12" width="28" height="40" rx="6" fill="${C.sun}"/>${fitPath(silhouette('dhaka').d, silhouette('dhaka').bbox, 34, 20, 20, 24)} fill="${C.paper}"/></g>`],
  'distance-duel': ['Distance duel', `<rect x="4" y="38" width="56" height="16" rx="4" fill="${C.marigold}"/><path d="M12 38v7M20 38v4M28 38v7M36 38v4M44 38v7M52 38v4" stroke="${C.ink}" stroke-width="2.5"/><path d="M16 32s-8-8-8-14a8 8 0 0 1 16 0c0 6-8 14-8 14z" fill="${C.sun}"/><path d="M48 32s-8-8-8-14a8 8 0 0 1 16 0c0 6-8 14-8 14z" fill="${C.forest}"/><circle cx="16" cy="18" r="3" fill="${C.paper}"/><circle cx="48" cy="18" r="3" fill="${C.paper}"/>`],
  'district-quiz': ['District quiz', `${fitPath(country, [16, 16, 584, 744], 8, 4, 48, 56)} fill="${C.forest}"/><circle cx="46" cy="44" r="14" fill="${C.marigold}"/><path d="M42 40a4 4 0 1 1 5.6 3.7c-1 .5-1.6 1.4-1.6 2.5v.8" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="46" cy="51.5" r="1.6" fill="${C.ink}"/>`],
  'famous-quiz': ['Famous things quiz', `<ellipse cx="32" cy="46" rx="26" ry="8" fill="${C.clay}"/><path d="M10 44c0-12 10-20 22-20s22 8 22 20z" fill="${C.marigold}"/><circle cx="24" cy="34" r="4" fill="${C.paper}"/><circle cx="35" cy="31" r="4" fill="${C.paper}"/><circle cx="44" cy="37" r="4" fill="${C.paper}"/><path d="M28 18c-2-4 2-6 0-10M36 18c-2-4 2-6 0-10" stroke="${C.stone}" stroke-width="3" fill="none" stroke-linecap="round"/>`],
  'personality-quiz': ['Travel personality quiz', `<rect x="6" y="6" width="24" height="24" rx="6" fill="${KIND_COLORS.hill}"/><rect x="34" y="6" width="24" height="24" rx="6" fill="${KIND_COLORS.beach}"/><rect x="6" y="34" width="24" height="24" rx="6" fill="${KIND_COLORS.heritage}"/><rect x="34" y="34" width="24" height="24" rx="6" fill="${KIND_COLORS.river}"/>` +
    ['hill', 'beach', 'heritage', 'river'].map((k, i) => `<g transform="translate(${i % 2 ? 40 : 12} ${i < 2 ? 12 : 40}) scale(.5)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${KIND_ICONS[k][1]}</g>`).join('')],
};
for (const [k, [label, body]] of Object.entries(GAMES)) write(`icons/games/${k}.svg`, duo(body, label));

// ---------- illustrations (wide, for page headers & empty states) ----------
const ill = (w, h, body, label) => svgDoc(w, h, body, ` role="img" aria-label="${esc(label)}"`);
const hills = (y, col, seed, w = 800, amp = 40) => {
  const r = rng(seed); let d = `M0 ${y}`;
  for (let x = 0; x <= w; x += 80) d += ` Q${x + 40} ${y - r.range(0, amp)} ${x + 80} ${y - r.range(-amp / 3, amp / 2)}`;
  return `<path d="${d} V${y + 400} H0Z" fill="${col}"/>`;
};
const scatterMap = (x, y, h, seed, tone = [C.forest, C.leaf, C.marigold]) => {
  const r = rng(seed), s = h / 760;
  return `<g transform="translate(${x} ${y}) scale(${s})">` + bd.districts.map((d) =>
    `<path d="${d.d}" fill="${r() < 0.3 ? r.pick(tone) : C.sand}" stroke="${C.paper}" stroke-width="1.5"/>`).join('') + '</g>';
};
const ILL = {
  'hero-home': ['Rivers, hills and a setting sun over Bangladesh', 1600, 900, () =>
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C27A"/><stop offset=".55" stop-color="#F7DDB1"/><stop offset="1" stop-color="#FBF0DC"/></linearGradient>
     <linearGradient id="wat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B880"/><stop offset="1" stop-color="#3E8FA9"/></linearGradient></defs>
     <rect width="1600" height="900" fill="url(#sky)"/><circle cx="1050" cy="470" r="120" fill="${C.sun}" opacity=".92"/>
     ${hills(520, '#9CC7A0', 'h1', 1600, 90)}${hills(560, '#5FA77B', 'h2', 1600, 70)}
     <rect y="590" width="1600" height="310" fill="url(#wat)"/>
     <path d="M0 640h1600" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
     ${[...Array(9)].map((_, i) => `<path d="M${120 + i * 170} ${660 + (i % 3) * 60}h${60 + (i % 4) * 25}" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>`).join('')}
     <g transform="translate(560 700)"><path d="M-110 0h220l-40 34h-140z" fill="${C.ink}"/><path d="M-20 0V-120l90 104z" fill="${C.paper}"/><path d="M-20 -120V0" stroke="${C.ink}" stroke-width="5"/></g>
     <path d="M300 400l30-12 30 12M380 380l25-10 25 10M1250 360l22-9 22 9" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`],
  'empty-map': ['Empty travel map waiting to be coloured', 800, 600, () =>
    `<rect width="800" height="600" rx="32" fill="${C.paper}"/>${scatterMap(260, 30, 540, 'empty', [C.sand])}
     <g transform="translate(470 330)"><circle r="70" fill="${C.marigold}" opacity=".25"/><path d="M-30 30l50-50M-30 30l-12 22 22-12z" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/><path d="M20 -20l18-18 12 12-18 18z" fill="${C.sun}"/></g>`],
  'not-found': ['Lost on the map', 800, 600, () =>
    `<rect width="800" height="600" rx="32" fill="${C.paper}"/><rect x="140" y="120" width="520" height="360" rx="20" fill="#EFE3CB" transform="rotate(-4 400 300)"/>
     <path d="M180 420c80-60 120 20 200-40s140-40 240-110" stroke="${C.river}" stroke-width="10" stroke-dasharray="2 22" stroke-linecap="round" fill="none"/>
     <g transform="translate(400 290)"><circle r="92" fill="${C.paper}" stroke="${C.ink}" stroke-width="10"/><path d="M-20 26l52-58-14 70z" fill="${C.sun}"/><path d="M20 -26l-52 58 14-70z" fill="${C.ink}"/></g>
     <path d="M600 160l30 30M630 160l-30 30" stroke="${C.sun}" stroke-width="12" stroke-linecap="round"/>`],
  'game-hub': ['Map puzzle pieces and a trophy', 1200, 500, () =>
    `<rect width="1200" height="500" rx="32" fill="${C.ink}"/>${scatterMap(80, 30, 440, 'hub', [C.forest, C.leaf, C.marigold, C.sun])}
     <g transform="translate(860 110) scale(11)" fill="none" stroke="${C.marigold}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${UI_ICONS.trophy[1]}</g>
     ${['?', '?', '?'].map((q, i) => `<path d="${textPath(q, { font: 'serif', size: 150 - i * 30, x: 560 + i * 100, y: 210 + i * 100 }).d}" fill="${[C.sun, C.leaf, C.river][i]}"/>`).join('')}`],
  'upload': ['Camera over the hills', 800, 500, () =>
    `<rect width="800" height="500" rx="32" fill="#E8F1F6"/>${hills(380, '#9CC7A0', 'u1', 800, 70)}${hills(420, C.leaf, 'u2', 800, 50)}<circle cx="600" cy="150" r="50" fill="${C.marigold}"/>
     <g transform="translate(400 250)"><rect x="-120" y="-80" width="240" height="160" rx="24" fill="${C.ink}"/><rect x="-50" y="-104" width="100" height="36" rx="10" fill="${C.ink}"/><circle r="52" fill="${C.paper}"/><circle r="34" fill="${C.river}"/><circle cx="12" cy="-12" r="10" fill="#fff" opacity=".7"/></g>`],
  'planner': ['A route between pins', 800, 500, () =>
    `<rect width="800" height="500" rx="32" fill="${C.paper}"/>${scatterMap(230, 20, 460, 'plan', [C.sand])}
     <path d="M400 220C430 260 380 300 420 340S520 380 540 430" stroke="${C.sun}" stroke-width="7" stroke-dasharray="14 12" fill="none" stroke-linecap="round"/>
     ${[[400, 220, C.forest], [420, 340, C.marigold], [540, 430, C.sun]].map(([x, y, c], i) => `<g transform="translate(${x - 18} ${y - 46})"><path d="M18 46S0 28 0 17a18 18 0 0 1 36 0c0 11-18 29-18 29z" fill="${c}" stroke="#fff" stroke-width="3"/><path d="${textPath(String(i + 1), { font: 'sansBold', size: 20, x: 18, y: 24, anchor: 'middle' }).d}" fill="#fff"/></g>`).join('')}`],
  'safety': ['First-aid kit and a phone', 800, 500, () =>
    `<rect width="800" height="500" rx="32" fill="#FDECE9"/><rect x="200" y="160" width="260" height="200" rx="24" fill="${C.sun}"/><rect x="280" y="130" width="100" height="40" rx="12" fill="none" stroke="${C.sun}" stroke-width="16"/><path d="M330 210v100M280 260h100" stroke="#fff" stroke-width="28" stroke-linecap="round"/>
     <rect x="500" y="150" width="120" height="220" rx="22" fill="${C.ink}"/><rect x="514" y="172" width="92" height="160" rx="8" fill="${C.mist}"/><path d="${textPath('999', { font: 'sansBold', size: 40, x: 560, y: 268, anchor: 'middle' }).d}" fill="${C.sun}"/>`],
};
for (const [k, [label, w, h, fn]] of Object.entries(ILL)) write(`illustrations/${k}.svg`, ill(w, h, fn(), label));

// ---------- passport stamps (one per district) ----------
const districts = read('districts.json');
for (const d of districts) {
  const r = rng('stamp-' + d.slug), col = mix(DIVISION_COLORS[d.division], C.ink, 0.25), rot = r.range(-9, 9).toFixed(1);
  const sil = silhouette(d.slug);
  const en = fitText(d.name_en.toUpperCase(), { font: 'sansBold', size: 28, x: 160, y: 228, anchor: 'middle', tracking: 0.04 }, 180);
  const bn = fitText(d.name_bn, { font: 'sansBold', size: 30, x: 160, y: 98, anchor: 'middle' }, 170);
  const no = textPath(`UNSEEN BD · ${String(d.id).padStart(2, '0')}/64`, { font: 'sansSemi', size: 12, x: 160, y: 258, anchor: 'middle', tracking: 0.08 });
  write(`stamps/${d.slug}.svg`, svgDoc(320, 320, `
    <g transform="rotate(${rot} 160 160)" fill="none" stroke="${col}">
      <circle cx="160" cy="160" r="150" stroke-width="6"/><circle cx="160" cy="160" r="138" stroke-width="2" stroke-dasharray="3 5"/>
      <circle cx="160" cy="160" r="118" stroke-width="3"/>
      <g stroke="none" fill="${col}">${fitPath(sil.d, sil.bbox, 116, 110, 88, 88)} fill-opacity=".85"/>
      <path d="${en.d}"/><path d="${bn.d}"/><path d="${no.d}" fill-opacity=".8"/>
</g>
    </g>`, ` role="img" aria-label="Passport stamp: ${d.name_en}"`));
}

// ---------- level badges ----------
const LEVELS = read('reference.json').my_bangladesh_levels;
const tiers = [['#C98B5A', '#8A5530'], ['#B9C2CC', '#6E7A88'], ['#F2C14E', '#B07E12'], ['#2FA57A', '#0E6B4E'], ['#E9604F', '#9E2A1F']];
LEVELS.forEach((lv, i) => {
  const [a, b] = tiers[i];
  const n = textPath(String(lv.min_districts), { font: 'serif', size: 76, x: 120, y: 128, anchor: 'middle' });
  const t1 = fitText(lv.title_en.replace('Bangladesh ', '').toUpperCase(), { font: 'sansBold', size: 22, x: 120, y: 236, anchor: 'middle', tracking: 0.06 }, 170);
  const t2 = fitText(lv.title_bn.replace('বাংলাদেশ ', ''), { font: 'sansBold', size: 20, x: 120, y: 168, anchor: 'middle' }, 112);
  const slug = lv.title_en.split(' ').pop().toLowerCase();
  write(`badges/level-${i + 1}-${slug}.svg`, svgDoc(240, 260, `
    <defs><linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <path d="M70 196l-22 58 36-14 22 20 14-64zM170 196l22 58-36-14-22 20-14-64z" fill="${C.sun}"/>
    <path d="M120 8l92 40v66c0 56-40 92-92 108-52-16-92-52-92-108V48z" fill="url(#g${i})" stroke="${C.ink}" stroke-opacity=".2" stroke-width="3"/>
    <path d="M120 28l74 32v54c0 44-31 74-74 88-43-14-74-44-74-88V60z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>
    <path d="${n.d}" fill="#fff"/><path d="${t2.d}" fill="#fff"/>
    <rect x="22" y="212" width="196" height="36" rx="18" fill="${C.ink}"/><path d="${t1.d}" fill="#fff"/>`,
  ` role="img" aria-label="${lv.title_en}: ${lv.min_districts} districts"`));
});

// ---------- card-maker colour themes ----------
const THEMES = [
  { key: 'dusk', name_en: 'Dusk', name_bn: 'সাঁঝ', bg: ['#1B1F4B', '#5B2A55'], land: '#2C3364', visited: '#F2A541', border: '#1B1F4B', text: '#FBF6EC', accent: '#FF8A65' },
  { key: 'dawn', name_en: 'Dawn', name_bn: 'ভোর', bg: ['#FDE7D3', '#F9C9B6'], land: '#F6DCCB', visited: '#E2483A', border: '#FDF2E9', text: '#3A2232', accent: '#F2A541' },
  { key: 'jamdani', name_en: 'Jamdani', name_bn: 'জামদানি', bg: ['#F4EEE2', '#E9DFCB'], land: '#E4D8C0', visited: '#7B2D5B', border: '#F4EEE2', text: '#2B1B2E', accent: '#C9A227', pattern: true },
  { key: 'padma', name_en: 'Padma', name_bn: 'পদ্মা', bg: ['#0F4C64', '#1E7C93'], land: '#2A6F86', visited: '#CFE1F1', border: '#0F4C64', text: '#F2FAFF', accent: '#F2A541' },
  { key: 'earth', name_en: 'Earth', name_bn: 'মাটি', bg: ['#EADBC4', '#D6B48C'], land: '#E2CDB0', visited: '#8C4A2F', border: '#EADBC4', text: '#3B2416', accent: '#2F7A3F' },
  { key: 'mist', name_en: 'Mist', name_bn: 'কুয়াশা', bg: ['#E9EEF2', '#D3DEE6'], land: '#DDE5EB', visited: '#0E6B4E', border: '#F3F6F8', text: '#16232E', accent: '#2E86A8' },
];
write('card-themes/themes.json', JSON.stringify(THEMES, null, 1) + '\n');
for (const t of THEMES) {
  const r = rng('theme-' + t.key);
  const visited = new Set(districts.filter(() => r() < 0.32).map((d) => d.slug));
  const map = `<g transform="translate(360 40) scale(${720 / 760 * 0.92})">` + bd.districts.map((d) =>
    `<path d="${d.d}" fill="${visited.has(d.slug) ? t.visited : t.land}" stroke="${t.border}" stroke-width="1.6"/>`).join('') + '</g>';
  const pat = t.pattern ? `<pattern id="jp" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 6l6 14-6 14-6-14z" fill="${t.visited}" opacity=".08"/><circle cx="0" cy="0" r="3" fill="${t.accent}" opacity=".18"/></pattern>` : '';
  const big = textPath(`${visited.size} / 64`, { font: 'serif', size: 96, x: 60, y: 300 });
  const lbl = textPath(t.name_en + ' · ' + t.name_bn, { font: 'sansSemi', size: 28, x: 60, y: 120 });
  write(`card-themes/${t.key}.svg`, svgDoc(1080, 720, `
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg[0]}"/><stop offset="1" stop-color="${t.bg[1]}"/></linearGradient>${pat}</defs>
    <rect width="1080" height="720" fill="url(#bg)"/>${t.pattern ? '<rect width="1080" height="720" fill="url(#jp)"/>' : ''}${map}
    <path d="${lbl.d}" fill="${t.accent}"/><path d="${big.d}" fill="${t.text}"/>
    <path d="${textPath('districts seen', { font: 'sansSemi', size: 30, x: 64, y: 350 }).d}" fill="${t.text}" fill-opacity=".75"/>
    <rect x="60" y="600" width="250" height="10" rx="5" fill="${t.text}" fill-opacity=".15"/><rect x="60" y="600" width="${(250 * visited.size) / 64}" height="10" rx="5" fill="${t.accent}"/>`,
  ` role="img" aria-label="${t.name_en} card theme preview"`));
}
console.log('icons done:', Object.keys(KIND_ICONS).length, 'kinds,', Object.keys(UI_ICONS).length, 'ui,', Object.keys(GAMES).length, 'games,', Object.keys(ILL).length, 'illustrations,', districts.length, 'stamps,', LEVELS.length, 'badges,', THEMES.length, 'themes');
