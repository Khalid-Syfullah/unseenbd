// 257 illustrated place covers: one generated scene per place, chosen by place type and name.
import fs from 'node:fs';
import path from 'node:path';
import { OUT, read, write, saveWebp, esc } from './lib.mjs';
import * as S from './scene.mjs';
import * as A from './architecture.mjs';

const { W, H, MOODS, mix, rng } = S;
const only = process.argv[2]; // optional slug filter for quick previews

// ---------- classify a place into a scene + variant ----------
const has = (n, re) => re.test(n);
export function classify(p) {
  const n = (p.name_en + ' ' + p.slug).toLowerCase(), k = p.kind;
  if (k === 'spiritual' || (k === 'heritage' && has(n, /mosque|masjid|temple|math\b|deul|mandir|jor bangla|nabaratna/))) {
    if (has(n, /church|mission/)) return ['arch', 'church'];
    if (has(n, /buddh|vihara|bihar|kutir|monaster|jadi|zadi|seema|ramu|rajban/)) return ['arch', has(n, /ramu|seema|kyang|monaster/) ? 'kyang' : 'zedi'];
    if (has(n, /shrine|tomb|darbar|sharif|nalta|mazar/)) return ['arch', 'shrine'];
    if (has(n, /eidgah/)) return ['arch', 'eidgah'];
    if (has(n, /mosque|masjid/)) {
      if (has(n, /sixty|chhoto sona|60/)) return ['arch', 'mosque-many'];
      if (has(n, /baitul mukarram/)) return ['arch', 'mosque-modern'];
      return ['arch', 'mosque'];
    }
    if (has(n, /eleven|baro shibaloy|twin/)) return ['arch', 'temple-row'];
    if (has(n, /kantajew|nabaratna|puthia|dayamoyee/)) return ['arch', 'temple-nabaratna'];
    if (has(n, /jor bangla/)) return ['arch', 'temple-jorbangla'];
    if (has(n, /math|deul/)) return ['arch', 'temple-math'];
    if (k === 'spiritual' && has(n, /thakur bari|akhra|ashram/)) return ['arch', 'temple'];
    return ['arch', 'temple'];
  }
  if (k === 'heritage') {
    if (has(n, /cemetery/)) return ['arch', 'cemetery'];
    if (has(n, /martyrs' memorial|national martyrs/)) return ['arch', 'smriti'];
    if (has(n, /shaheed minar/)) return ['arch', 'minar'];
    if (has(n, /parliament/)) return ['arch', 'parliament'];
    if (has(n, /bridge/)) return ['river', 'truss-bridge'];
    if (has(n, /mausoleum/)) return ['arch', 'tomb'];
    if (has(n, /memorial|mujibnagar|museum and|complex/) && !has(n, /rabindra|madhupalli|sultan/)) return ['arch', has(n, /museum/) ? 'museum' : 'obelisk'];
    if (has(n, /museum/)) return ['arch', 'museum'];
    if (has(n, /fort|castle|garh\b|garh |mahasthan/)) return ['arch', has(n, /mahasthan|dharmapal|bhitargarh/) ? 'fort-ruined' : has(n, /lalbagh/) ? 'fort-dome' : 'fort'];
    if (has(n, /vihara|bihar|paharpur|sitakot|mura|medh/)) return ['arch', has(n, /mura|medh/) ? 'ruins-mounds' : 'ruins'];
    if (has(n, /wari|bateshwar/)) return ['arch', 'ruins-mounds'];
    if (has(n, /carew/)) return ['arch', 'factory'];
    if (has(n, /panam/)) return ['arch', 'street'];
    if (has(n, /dighi/)) return ['arch', 'pillar'];
    if (has(n, /manzil/)) return ['arch', 'palace-manzil'];
    if (has(n, /neelkuthi|kuthi|lodge|kacharibari|kuthibari|ashram|madhupalli/)) return ['arch', 'bungalow'];
    if (has(n, /nawab|zamindar|rajbari|palace/)) return ['arch', 'palace'];
    if (has(n, /house|home|homestead|birthplace|munshibari|dalan/)) return ['arch', 'homestead'];
    return ['arch', has(n, /zamindar|rajbari|palace/) ? 'palace' : 'palace'];
  }
  if (k === 'hill') return ['hill', has(n, /cave/) ? 'cave' : has(n, /clay/) ? 'clay' : has(n, /chandranath|temple/) ? 'hilltemple' : has(n, /sajek|nilgiri|hatimatha/) ? 'cloudsea' : 'green'];
  if (k === 'beach') return ['beach', has(n, /char|tarua/) ? 'char' : has(n, /patenga/) ? 'ships' : has(n, /forest/) ? 'forest' : has(n, /guliakhali/) ? 'grass' : 'resort'];
  if (k === 'island') return ['island', has(n, /saint martin/) ? 'coral' : has(n, /dublar/) ? 'fish' : has(n, /nijhum|monpura|kukri|sonar/) ? 'deer' : 'sand'];
  if (k === 'waterfall') return ['waterfall', has(n, /nafakhum/) ? 'wide' : has(n, /himchari/) ? 'sea' : 'tall'];
  if (k === 'forest') return ['forest', has(n, /ratargul|swamp/) ? 'swamp' : has(n, /sundarban|karamjal|katka|kalagachhia|tengragiri/) ? 'mangrove' : has(n, /shimul/) ? 'shimul' : has(n, /banyan/) ? 'banyan' : 'woods'];
  if (k === 'tea') return ['tea', has(n, /flat|tetulia/) ? 'flat' : 'hills'];
  if (k === 'village') return ['village', has(n, /rose|flower|gadkhali/) ? 'flowers' : has(n, /mustard/) ? 'mustard' : has(n, /jamdani|weaving/) ? 'weaving' : has(n, /guava|boat market/) ? 'floating' : has(n, /mango/) ? 'mango' : has(n, /corridor/) ? 'corridor' : 'paddy'];
  if (k === 'city') return [has(n, /bridge/) ? 'river' : 'city', has(n, /bridge/) ? 'cable-bridge' : has(n, /museum/) ? 'museum' : has(n, /foy/) ? 'hill-lake' : 'dighi'];
  if (k === 'river') {
    if (has(n, /barrage|project/)) return ['river', 'barrage'];
    if (has(n, /khum/)) return ['river', 'canyon'];
    if (has(n, /jaflong|bichanakandi|sada pathor|lalakhal|jadukata|someshwari/)) return ['river', 'stony'];
    if (has(n, /zero point|tetulia/)) return ['river', 'peak'];
    if (has(n, /lily|lotus|satla|dibir/)) return ['river', 'lilies'];
    if (has(n, /road/)) return ['river', 'road'];
    if (has(n, /haor|beel/)) return ['river', 'haor'];
    if (has(n, /kaptai|boga|niladri|madhabpur/)) return ['river', 'hill-lake'];
    if (has(n, /lake|pukur|sagar|dighi/)) return ['city', 'dighi'];
    if (has(n, /port|hat\b|chilmari/)) return ['river', 'port'];
    if (has(n, /ghat|bandh|riverside/)) return ['river', 'ghat'];
    return ['river', 'boats'];
  }
  return ['river', 'boats'];
}

// ---------- palettes for buildings ----------
const BASE = {
  white: { wall: '#EFE7DA', roof: '#F6F1E8', dark: '#5B4A3E', light: '#FFFFFF', accent: '#2E8B57' },
  brick: { wall: '#B4643D', roof: '#A35733', dark: '#5A2C18', light: '#E3A57D', accent: '#E3A57D' },
  stone: { wall: '#8A847C', roof: '#7A746D', dark: '#3A3632', light: '#C8C2B8', accent: '#C8C2B8' },
  terracotta: { wall: '#BC6A40', roof: '#AA5C37', dark: '#56291A', light: '#E8A97F', accent: '#E8A97F' },
  vermilion: { wall: '#E4C27A', roof: '#D9573F', dark: '#5E2A1C', light: '#FFF0C8', accent: '#D9573F' },
  gold: { wall: '#EADDBF', roof: '#E3B23F', dark: '#7A5A1E', light: '#FFF2C6', accent: '#C9962B' },
  kyang: { wall: '#C99A6B', roof: '#7A3B2A', dark: '#3E2316', light: '#F2D3A8', accent: '#E3B23F' },
  church: { wall: '#ECE4D6', roof: '#8C3B2E', dark: '#3E3A3A', light: '#FFFFFF', accent: '#8C3B2E' },
  shrine: { wall: '#F1EDE6', roof: '#2E8B57', dark: '#4A3B30', light: '#FFFFFF', accent: '#2E8B57' },
  fort: { wall: '#A9553A', roof: '#C9875E', dark: '#4E2617', light: '#D98F6A', accent: '#D98F6A' },
  cream: { wall: '#E6D5B8', roof: '#E6D5B8', dark: '#5B4636', light: '#FFFFFF', accent: '#B5653C' },
  faded: { wall: '#C9B49A', roof: '#C9B49A', dark: '#4E3E30', light: '#EFE4D2', accent: '#8C6B4B' },
  pink: { wall: '#D88A98', roof: '#C77788', dark: '#5A2F38', light: '#F7D9DF', accent: '#C77788' },
  bungalow: { wall: '#E7DCC7', roof: '#8E3B2B', dark: '#4B3A2E', light: '#FFFFFF', accent: '#8E3B2B' },
  concrete: { wall: '#C9C2B8', roof: '#C9C2B8', dark: '#5E5852', light: '#F2EEE8', accent: '#E2483A' },
  marble: { wall: '#F4F1EA', roof: '#F4F1EA', dark: '#9A9488', light: '#FFFFFF', accent: '#E2483A' },
  ochre: { wall: '#E2C07A', roof: '#E2C07A', dark: '#5A4426', light: '#FFF3D2', accent: '#B5653C' },
  slate: { wall: '#B9C2C4', roof: '#B9C2C4', dark: '#3E4A50', light: '#EEF2F2', accent: '#8C6B4B' },
  mud: { wall: '#C9A06A', roof: '#B08A4E', dark: '#5A3E22', light: '#EAD3A8', accent: '#B08A4E' },
};
function tone(P, M, mood) {
  const k = { dusk: 0.4, golden: 0.12, monsoon: 0.12, mist: 0.1, dawn: 0.12, day: 0.02 }[mood];
  const warm = mood === 'golden' ? '#E9A55A' : mood === 'dawn' ? '#F3B9A6' : null;
  const o = {};
  for (const [key, c] of Object.entries(P)) o[key] = mix(warm ? mix(c, warm, 0.12) : c, M.shade, k);
  return o;
}
function paletteFor(sub, n, r) {
  if (sub.startsWith('mosque')) {
    if (/kusumba|chhoto sona|darasbari|bagha/.test(n)) return BASE.stone;
    if (/sixty|shahi|atia|baba adam|goaldi|nayabad|masjidkur|khan jahan|majidbaria|kherua|bibichini|jhaudia|gholdari|arifail|pathrail|momin|chatmohar|mithapukur|kismat|harano|chandamari|shah sultan/.test(n)) return BASE.brick;
    return BASE.white;
  }
  if (sub === 'eidgah') return BASE.white;
  if (sub.startsWith('temple')) return /dhakeshwari|jessoreshwari|orakandi|siddheshwari|adinath|chandrabati/.test(n) ? BASE.vermilion : BASE.terracotta;
  if (sub === 'zedi') return BASE.gold;
  if (sub === 'kyang') return BASE.kyang;
  if (sub === 'church') return BASE.church;
  if (sub === 'shrine') return BASE.shrine;
  if (sub.startsWith('fort')) return BASE.fort;
  if (sub.startsWith('ruins')) return BASE.brick;
  if (sub === 'palace-manzil') return BASE.pink;
  if (sub === 'palace') return /tajhat|rajbari, natore|dinajpur/.test(n) ? BASE.brick : r.pick([BASE.cream, BASE.faded, BASE.ochre, BASE.white, BASE.faded, BASE.slate]);
  if (sub === 'bungalow') return BASE.bungalow;
  if (sub === 'homestead') return BASE.mud;
  if (sub === 'tomb') return /bangabandhu/.test(n) ? BASE.marble : BASE.white;
  if (sub === 'smriti') return BASE.concrete;
  if (sub === 'minar' || sub === 'obelisk' || sub === 'cemetery') return BASE.marble;
  if (sub === 'parliament') return BASE.concrete;
  if (sub === 'factory' || sub === 'street') return BASE.faded;
  if (sub === 'pillar') return BASE.stone;
  if (sub === 'museum') return BASE.white;
  return BASE.cream;
}

// ---------- scenes ----------
function archScene(p, sub, M, mood, r, n) {
  const P = tone(paletteFor(sub, n, r), M, mood);
  const g = r.range(575, 615);
  const pond = ['mosque', 'temple', 'temple-nabaratna', 'temple-jorbangla', 'palace', 'palace-manzil', 'zedi', 'shrine', 'tomb', 'parliament', 'pillar', 'museum', 'bungalow'].includes(sub) && (sub === 'parliament' || sub === 'pillar' || r() < 0.45);
  const sunX = r.range(150, 1050);
  let s = S.sky(M, r, { sunX, sunY: r.range(140, 260), sunR: r.range(48, 70), clouds: r.int(1, 3) });
  s += S.ridge(r, M, { y: g - 150, amp: 40, step: 160, jag: 0.6, t: 0.75 });
  s += S.canopyRow(r, { y: g - 40, h: 70, col: S.far(M, M.green[1], 0.45) });
  const lawn = ['smriti', 'minar', 'obelisk', 'street', 'factory'].includes(sub) ? mix('#D9C7A6', M.shade, 0.1) : S.far(M, M.green[1], 0.1);
  s += `<rect x="-10" y="${g - 30}" width="${W + 20}" height="${H - g + 40}" fill="${lawn}"/>`;
  // side trees
  const treeCol = mix(M.green[2], M.shade, 0.1);
  for (const side of [-1, 1]) {
    const x = side < 0 ? r.range(20, 150) : r.range(1050, 1180), kind = r.pick(['palm', 'round', 'betel', 'round']);
    s += kind === 'palm' ? S.palm(x, g + 10, r.range(220, 320), treeCol, r) : kind === 'betel' ? S.betelPalm(x, g + 10, r.range(240, 300), treeCol) + S.betelPalm(x + 30 * side, g + 14, r.range(200, 260), treeCol) : S.roundTree(x, g + 14, r.range(200, 300), treeCol, r);
  }
  const x = W / 2 + r.range(-50, 50);
  let b = '';
  const sc = (v) => v * r.range(0.95, 1.08);
  switch (sub) {
    case 'mosque': b = A.mosque(x, g, sc(1.25), P, { domes: r.pick([1, 3, 3, 5]), minarets: r() < 0.7 }); break;
    case 'mosque-many': b = A.mosque(x, g, sc(1.7), P, { style: 'many' }); break;
    case 'mosque-modern': b = A.mosque(x, g, sc(1.5), P, { style: 'modern' }); break;
    case 'eidgah': b = A.mosque(x, g, sc(1.5), P, { style: 'eidgah' }); break;
    case 'temple': b = A.temple(x, g, sc(1.3), P); break;
    case 'temple-nabaratna': b = A.temple(x, g, sc(1.4), P, { style: 'nabaratna' }); break;
    case 'temple-jorbangla': b = A.temple(x, g, sc(1.5), P, { style: 'jorbangla' }); break;
    case 'temple-math': b = A.temple(x, g, sc(1.15), P, { style: 'math' }); break;
    case 'temple-row': b = A.temple(x, g, sc(1.25), P, { style: 'row', count: /eleven/.test(n) ? 11 : 12 }); break;
    case 'zedi': b = A.stupa(x, g, sc(1.15), P); break;
    case 'kyang': b = A.stupa(x, g, sc(1.4), P, { style: 'kyang' }); break;
    case 'church': b = A.church(x + 20, g, sc(1.35), P); break;
    case 'shrine': b = A.shrine(x, g, sc(1.35), P); break;
    case 'tomb': b = A.tomb(x, g, sc(1.5), P); break;
    case 'fort': b = A.fort(x, g, sc(1.25), P); break;
    case 'fort-dome': b = A.fort(x, g, sc(1.25), P, { domeInside: true }); break;
    case 'fort-ruined': b = A.fort(x, g, sc(1.5), P, { ruined: true }); break;
    case 'ruins': b = A.ruins(x, g, sc(1.55), P); break;
    case 'ruins-mounds': b = A.ruins(x, g, sc(1.5), P, { style: 'mounds' }); break;
    case 'palace': { const bays = r.pick([5, 7, 7, 9, 11]), storeys = r.pick([1, 2, 2, 3]); b = A.palace(x + r.range(-80, 80), g, sc(Math.min(1.45, 900 / (bays * 58 + 30))), P, { decay: r() < 0.55, bays, storeys, portico: r() < 0.75 }); break; }
    case 'palace-manzil': b = A.palace(x, g, sc(1.45), P, { style: 'manzil', bays: 11 }); break;
    case 'bungalow': b = A.bungalow(x, g, sc(1.5), P); break;
    case 'homestead': b = A.hut(x - 140, g, 1.5, P, { tin: true }) + A.hut(x + 150, g + 20, 1.3, P, { tin: r() < 0.5 }) + S.roundTree(x + 10, g - 10, 260, treeCol, r); break;
    case 'museum': b = A.museum(x, g, sc(1.5), P); break;
    case 'parliament': b = A.parliament(x, g, sc(1.35), P); break;
    case 'smriti': b = A.smritiSoudho(x, g, sc(1.4), P); break;
    case 'minar': b = A.shaheedMinar(x, g, sc(1.25), P); break;
    case 'obelisk': b = A.obelisk(x, g, sc(1.25), P); break;
    case 'cemetery': b = A.cemetery(r, x, g - 20, 1, P); break;
    case 'factory': b = A.factory(x, g, sc(1.6), P); break;
    case 'street': b = A.oldStreet(x, g, sc(1.25), P, r); break;
    case 'pillar': b = A.pillar(x, g, sc(1.2), P); break;
    default: b = A.palace(x, g, 1.6, P);
  }
  s += `<ellipse cx="${x}" cy="${g + 4}" rx="460" ry="14" fill="${M.shade}" opacity=".12"/>` + b;
  if (pond) {
    const top = g + 18;
    s += `<rect x="-10" y="${top}" width="${W + 20}" height="${H - top + 10}" fill="${mix(M.water[0], M.water[1], 0.4)}"/>`;
    s += `<g transform="translate(0 ${2 * top}) scale(1 -1)" opacity=".28"><clipPath id="pc"><rect x="0" y="${2 * top - H}" width="${W}" height="${H - top}"/></clipPath><g clip-path="url(#pc)">${b}</g></g>`;
    for (let i = 0; i < 18; i++) s += `<rect x="${S.f1(r.range(0, W))}" y="${S.f1(r.range(top + 10, H))}" width="${S.f1(r.range(40, 140))}" height="3" rx="1.5" fill="${M.light}" opacity=".35"/>`;
    s += `<rect x="-10" y="${top - 4}" width="${W + 20}" height="8" fill="${mix(P.wall, M.shade, 0.3)}" opacity=".6"/>`;
  } else {
    s += S.grassTufts(r, M, g + 40, 14);
    for (let i = 0, k = r.int(1, 4); i < k; i++) s += S.person(r.range(200, 1000), r.range(g + 60, H - 40), r.range(1.1, 1.6), mix(M.shade, '#000', 0.2));
  }
  return s;
}

function hillScene(p, sub, M, mood, r) {
  let s = S.sky(M, r, { sunY: r.range(130, 260), clouds: sub === 'cloudsea' ? 2 : r.int(1, 3) });
  if (sub === 'clay') {
    s += S.ridge(r, M, { y: 430, amp: 60, step: 140, t: 0.7 });
    s += S.ground(S.ridgePts(r, { y: 520, amp: 70, step: 120 }), mix('#EDE7DD', M.shade, 0.08));
    s += `<path d="M260 640Q600 560 980 640Q980 720 600 735Q240 720 260 640Z" fill="${mix('#3FB7B0', M.shade, 0.12)}"/>`;
    s += S.ground(S.ridgePts(r, { y: 690, amp: 30, step: 160 }), mix('#E3DACB', M.shade, 0.12));
    return s + S.grassTufts(r, M, 700, 8);
  }
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const t = 1 - i / (layers - 1);
    s += S.ridge(r, M, { y: 380 + i * 70, amp: 90 - i * 8, step: 140 + i * 20, jag: 0.45, t: 0.15 + t * 0.7, col: M.green[Math.min(2, Math.floor(i / 2))] });
    if (sub === 'cloudsea' && i < 3) s += S.mistBand(420 + i * 70, 50 + i * 10, M, 0.75);
    else if (r() < 0.4) s += S.mistBand(410 + i * 70, 26, M, 0.4);
  }
  if (sub === 'hilltemple') s += A.temple(r.range(500, 700), 455, 0.45, tone(BASE.marble, M, mood));
  if (sub === 'cave') s += `<path d="M520 800V700Q600 560 680 700V800Z" fill="${mix(M.shade, '#000', 0.5)}"/>` + S.person(470, 770, 1.8, mix(M.shade, '#000', 0.3)) + `<circle cx="482" cy="722" r="7" fill="#FFD27A"/>`;
  s += S.canopyRow(r, { y: 760, h: 80, col: mix(M.green[2], M.shade, 0.15), x0: -40, x1: r.range(250, 420) });
  if (sub === 'cloudsea' && r() < 0.7) s += A.hut(r.range(820, 1050), 700, 0.9, tone(BASE.bungalow, M, mood), { tin: true });
  return s;
}

function beachScene(p, sub, M, mood, r) {
  const hz = r.range(400, 450), sunX = r.range(250, 950);
  let s = S.sky(M, r, { sunX, sunY: hz - r.range(40, 150), clouds: r.int(1, 3) });
  s += S.water(M, r, { y: hz, sunX, ripples: 6 });
  if (sub === 'ships') for (let i = 0; i < 4; i++) s += S.ship(r.range(100, 1100), hz + 6, r.range(0.4, 0.9), S.far(M, M.shade, 0.5));
  s += S.waves(M, r, hz + 100, 4);
  const sand = sub === 'grass' ? M.green[1] : mix('#EBD3A4', M.shade, mood === 'dusk' ? 0.35 : 0.06);
  const pts = [];
  for (let x = -60; x <= W + 60; x += 120) pts.push([x, 610 + Math.sin(x / 210) * 25 + r.range(-10, 10)]);
  s += `<path d="${S.smooth(pts)}L${W + 60} ${H + 5}L-60 ${H + 5}Z" fill="${M.light}" opacity=".5" transform="translate(0 -10)"/>` + S.ground(pts, sand);
  if (sub === 'resort' || sub === 'forest') for (let i = 0; i < 12; i++) s += S.pine(r.range(-20, 220), r.range(600, 640), r.range(140, 260), mix(M.green[2], M.shade, 0.2));
  if (sub === 'forest') s += S.canopyRow(r, { y: 600, h: 90, col: mix(M.green[2], M.shade, 0.2), x0: 900, x1: 1260 });
  if (sub === 'resort') for (let i = 0; i < r.int(3, 6); i++) {
    const x = r.range(380, 1120), y = r.range(670, 760), c = r.pick(['#E2483A', '#F2A541', '#2E86A8', '#FBF6EC']);
    s += `<path d="M${S.f1(x)} ${S.f1(y)}v-70" stroke="${M.shade}" stroke-width="4"/><path d="M${S.f1(x - 55)} ${S.f1(y - 64)}Q${S.f1(x)} ${S.f1(y - 112)} ${S.f1(x + 55)} ${S.f1(y - 64)}Z" fill="${c}"/>`;
  }
  if (sub === 'char' || sub === 'grass') for (let i = 0; i < 6; i++) s += S.person(r.range(400, 1000), r.range(640, 700), 0.8, M.shade);
  s += S.boat(r.range(300, 900), hz + r.range(60, 120), r.range(0.6, 0.9), M, r);
  if (sub !== 'grass') for (let i = 0; i < 4; i++) s += S.person(r.range(300, 1100), r.range(660, 760), r.range(1.2, 1.7), mix(M.shade, '#000', 0.2));
  return s;
}

function islandScene(p, sub, M, mood, r) {
  const hz = r.range(380, 420), sunX = r.range(200, 1000);
  let s = S.sky(M, r, { sunX, sunY: hz - r.range(60, 160) });
  s += S.water(M, r, { y: hz, sunX, tint: sub === 'coral' ? '#36C2C2' : null, ripples: 10 });
  const cx = r.range(420, 780), iw = r.range(380, 520), iy = hz + 120;
  s += `<path d="M${S.f1(cx - iw)} ${S.f1(iy)}Q${S.f1(cx)} ${S.f1(iy - 70)} ${S.f1(cx + iw)} ${S.f1(iy)}Z" fill="${mix('#E6CF9C', M.shade, 0.1)}"/>`;
  s += S.canopyRow(r, { y: iy - 14, h: 60, col: S.far(M, M.green[1], 0.15), x0: cx - iw * 0.7, x1: cx + iw * 0.7 });
  for (let i = 0; i < 6; i++) s += S.palm(cx + r.range(-iw * 0.6, iw * 0.6), iy - 10, r.range(110, 180), mix(M.green[2], M.shade, 0.15), r);
  if (sub === 'coral') for (let i = 0; i < 14; i++) s += `<ellipse cx="${S.f1(r.range(0, W))}" cy="${S.f1(r.range(650, 790))}" rx="${S.f1(r.range(30, 90))}" ry="${S.f1(r.range(12, 30))}" fill="${mix('#4E4A44', M.shade, 0.2)}"/>`;
  if (sub === 'deer') for (let i = 0; i < 4; i++) s += S.deer(cx + r.range(-iw * 0.5, iw * 0.5), iy - 4, 0.9, mix('#B26A35', M.shade, 0.2));
  if (sub === 'fish') {
    s += S.ground([[-60, 690], [400, 670], [800, 700], [1260, 680]], mix('#E6CF9C', M.shade, 0.12));
    for (let i = 0; i < 5; i++) { const x = 120 + i * 210; s += `<path d="M${x} 700V600M${x + 160} 700V600M${x} 610H${x + 160}" stroke="${M.shade}" stroke-width="5"/>`; for (let k = 0; k < 10; k++) s += `<path d="M${x + 10 + k * 15} 612v26" stroke="${mix('#C8B07A', M.shade, 0.3)}" stroke-width="5" stroke-linecap="round"/>`; }
  }
  s += S.boat(r.range(150, 1050), r.range(560, 640), r.range(0.8, 1.1), M, r);
  return s;
}

function waterfallScene(p, sub, M, mood, r) {
  let s = S.sky(M, r, { sunY: r.range(110, 200), clouds: r.int(1, 2), birds: false });
  if (sub === 'sea') s += S.water(M, r, { y: 420, ripples: 6 });
  s += S.ridge(r, M, { y: 300, amp: 60, step: 150, t: 0.6 });
  const fx = r.range(480, 720), fw = sub === 'wide' ? r.range(260, 360) : r.range(70, 120), top = sub === 'wide' ? 430 : r.range(170, 240);
  const rock = mix('#6E6A62', M.shade, 0.15), rock2 = mix('#8C877D', M.shade, 0.1);
  s += `<path d="M-20 ${top - 40}L${S.f1(fx - fw / 2)} ${top}L${S.f1(fx - fw / 2 - 30)} 700L-20 720Z" fill="${rock}"/><path d="M${W + 20} ${top - 60}L${S.f1(fx + fw / 2)} ${top}L${S.f1(fx + fw / 2 + 40)} 700L${W + 20} 720Z" fill="${rock2}"/>`;
  s += S.canopyRow(r, { y: top - 20, h: 70, col: M.green[2], x0: -40, x1: fx - fw / 2 - 10 }) + S.canopyRow(r, { y: top - 30, h: 70, col: M.green[1], x0: fx + fw / 2 + 10, x1: W + 40 });
  s += `<defs><linearGradient id="fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${M.light}"/><stop offset="1" stop-color="${mix(M.water[0], M.light, 0.4)}"/></linearGradient></defs><path d="M${S.f1(fx - fw / 2)} ${top}H${S.f1(fx + fw / 2)}L${S.f1(fx + fw / 2 + 20)} 680H${S.f1(fx - fw / 2 - 20)}Z" fill="url(#fall)"/>`;
  for (let i = 0; i < 12; i++) { const xx = fx - fw / 2 + r.range(0, fw); s += `<path d="M${S.f1(xx)} ${top + r.range(10, 60)}V${S.f1(r.range(560, 680))}" stroke="${mix(M.water[0], M.shade, 0.15)}" stroke-width="${S.f1(r.range(2, 5))}" opacity=".35"/>`; }
  s += `<rect x="-10" y="660" width="${W + 20}" height="150" fill="${mix(M.water[0], M.water[1], 0.5)}"/><ellipse cx="${S.f1(fx)}" cy="670" rx="${S.f1(fw + 120)}" ry="40" fill="${M.light}" opacity=".7"/>`;
  for (let i = 0; i < 9; i++) s += `<ellipse cx="${S.f1(r.range(0, W))}" cy="${S.f1(r.range(700, 790))}" rx="${S.f1(r.range(30, 80))}" ry="${S.f1(r.range(12, 26))}" fill="${rock}"/>`;
  return s + S.person(r.range(150, 350), 720, 1.6, mix(M.shade, '#000', 0.3));
}

function forestScene(p, sub, M, mood, r) {
  let s = S.sky(M, r, { sunY: r.range(110, 220), clouds: r.int(0, 2) });
  if (sub === 'shimul') {
    s += S.ridge(r, M, { y: 500, amp: 20, step: 200, t: 0.6 }) + `<rect y="560" width="${W}" height="260" fill="${mix(M.green[0], '#C9B27A', 0.4)}"/>`;
    for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) {
      const k = 0.5 + row * 0.25, x = 80 + i * 170 + (row % 2) * 80 + r.range(-10, 10), y = 560 + row * 60;
      s += `<path d="M${S.f1(x)} ${S.f1(y)}V${S.f1(y - 200 * k)}M${S.f1(x)} ${S.f1(y - 120 * k)}l-${S.f1(60 * k)} -${S.f1(50 * k)}M${S.f1(x)} ${S.f1(y - 150 * k)}l${S.f1(60 * k)} -${S.f1(50 * k)}" stroke="${mix('#5A4030', M.shade, 0.2)}" stroke-width="${S.f1(6 * k)}"/>`;
      for (let f = 0; f < 14; f++) s += `<circle cx="${S.f1(x + r.range(-80, 80) * k)}" cy="${S.f1(y - r.range(120, 240) * k)}" r="${S.f1(r.range(5, 9) * k)}" fill="${r.pick(['#E2483A', '#D9363E', '#F05A3C'])}"/>`;
    }
    return s;
  }
  if (sub === 'banyan') {
    s += S.ridge(r, M, { y: 470, amp: 30, step: 180, t: 0.65 }) + `<rect y="560" width="${W}" height="260" fill="${M.green[1]}"/>`;
    return s + S.banyan(600, 640, 420, mix(M.green[2], M.shade, 0.1), r) + S.person(860, 700, 1.6, M.shade) + S.person(900, 705, 1.4, M.shade);
  }
  const wet = sub === 'swamp' || sub === 'mangrove';
  for (let i = 0; i < 4; i++) s += S.canopyRow(r, { y: 420 + i * 70, h: 90 - i * 5, col: S.far(M, M.green[Math.min(2, i)], 0.7 - i * 0.2) });
  if (wet) s += S.water(M, r, { y: 600, ripples: 16, tint: '#2F6B4E' });
  else s += `<rect y="660" width="${W}" height="160" fill="${mix(M.green[2], '#3A2A1E', 0.35)}"/>`;
  for (let i = 0; i < 9; i++) {
    const x = r.range(0, W), base = wet ? r.range(620, 760) : 700, h = r.range(260, 520);
    s += `<path d="M${S.f1(x - 9)} ${S.f1(base)}L${S.f1(x - 4)} ${S.f1(base - h)}H${S.f1(x + 4)}L${S.f1(x + 9)} ${S.f1(base)}Z" fill="${mix('#3A2A1E', M.shade, 0.25)}"/>`;
    if (wet) s += `<rect x="${S.f1(x - 12)}" y="${S.f1(base)}" width="24" height="${S.f1(h * 0.35)}" fill="${mix('#3A2A1E', M.shade, 0.25)}" opacity=".25"/>`;
  }
  if (mood !== 'dusk' && mood !== 'monsoon') s += `<g opacity=".14" fill="${M.light}">` + [0, 1, 2].map((i) => `<path d="M${S.f1(300 + i * 220)} 0l120 0l-260 800l-120 0z"/>`).join('') + '</g>';
  if (sub === 'swamp') s += S.boat(r.range(400, 800), 720, 1.1, M, r, { sail: false, roof: false });
  if (sub === 'mangrove') { for (let i = 0; i < 30; i++) s += `<path d="M${S.f1(r.range(0, W))} ${S.f1(r.range(610, 640))}v-${S.f1(r.range(8, 22))}" stroke="${mix('#3A2A1E', M.shade, 0.25)}" stroke-width="3"/>`; s += S.deer(r.range(150, 450), 640, 1.3, mix('#B26A35', M.shade, 0.2)); }
  return s;
}

function riverScene(p, sub, M, mood, r) {
  const hz = sub === 'canyon' ? 520 : r.range(430, 480), sunX = r.range(200, 1000);
  let s = S.sky(M, r, { sunX, sunY: hz - r.range(100, 220), clouds: r.int(1, 3) });
  if (sub === 'stony' || sub === 'hill-lake' || sub === 'peak') {
    for (let i = 0; i < 3; i++) s += S.ridge(r, M, { y: hz - 120 + i * 40, amp: sub === 'stony' ? 110 : 70, step: 150, jag: 0.4, t: 0.7 - i * 0.2, col: sub === 'stony' ? '#3E7A6A' : M.green[1] });
    if (sub === 'peak') s += `<path d="M620 ${hz - 60}L760 ${hz - 290}L830 ${hz - 220}L900 ${hz - 300}L1080 ${hz - 60}Z" fill="${S.far(M, '#C9D6E2', 0.3)}"/><path d="M730 ${hz - 240}L760 ${hz - 290}L830 ${hz - 220}L900 ${hz - 300}L930 ${hz - 250}L880 ${hz - 235}L830 ${hz - 200}L780 ${hz - 250}Z" fill="#FFFFFF"/>`;
  }
  if (sub === 'canyon') {
    s += `<path d="M-20 0H360Q420 300 470 ${hz}L420 ${H}H-20Z" fill="${mix('#5D6B55', M.shade, 0.2)}"/><path d="M${W + 20} 0H860Q800 300 740 ${hz}L800 ${H}H${W + 20}Z" fill="${mix('#6E7A62', M.shade, 0.15)}"/>`;
    s += S.canopyRow(r, { y: 90, h: 70, col: M.green[2], x0: -40, x1: 380 }) + S.canopyRow(r, { y: 90, h: 70, col: M.green[2], x0: 840, x1: W + 40 });
    s += `<path d="M470 ${hz}H740L800 ${H}H420Z" fill="${mix(M.water[0], '#2F8F7F', 0.4)}"/>` + S.boat(600, 690, 0.9, M, r, { sail: false, roof: false });
    return s;
  }
  s += S.water(M, r, { y: hz, sunX, tint: sub === 'stony' || sub === 'peak' ? '#3FB0A8' : null });
  if (!['stony', 'hill-lake', 'peak'].includes(sub)) s += S.canopyRow(r, { y: hz + 4, h: sub === 'haor' || sub === 'road' ? 22 : 40, col: S.far(M, M.green[1], 0.45) });
  if (sub === 'haor' || sub === 'lilies' || sub === 'road') {
    for (let i = 0; i < 9; i++) { const x = r.range(0, W), y = r.range(hz + 30, hz + 160), h = 50 + (y - hz) * 0.6; s += S.roundTree(x, y, h, S.far(M, M.green[2], 0.3 - (y - hz) / 600), r) + `<rect x="${S.f1(x - 2)}" y="${S.f1(y)}" width="4" height="${S.f1(h * 0.5)}" fill="${M.shade}" opacity=".15"/>`; }
  }
  if (sub === 'road') s += `<path d="M-20 650L${W + 20} 560V600L-20 700Z" fill="${mix('#7A7A78', M.shade, 0.2)}"/><path d="M-20 675L${W + 20} 580" stroke="#F2E6C8" stroke-width="3" stroke-dasharray="24 18"/>`;
  if (sub === 'lilies') s += S.lilies(r, M, hz + 120, 46, /red|dibir/.test(p.name_en.toLowerCase()) ? '#D93A4A' : r.pick(['#F28AA6', '#F6F1F4', '#F28AA6']));
  if (sub === 'barrage') { s += `<rect x="-20" y="${hz + 30}" width="${W + 40}" height="34" fill="${mix('#B8B2A8', M.shade, 0.15)}"/>`; for (let i = 0; i < 16; i++) s += `<rect x="${-10 + i * 80}" y="${hz + 30}" width="22" height="120" fill="${mix('#8A847C', M.shade, 0.2)}"/><rect x="${12 + i * 80}" y="${hz + 70}" width="58" height="60" fill="${mix('#4F6E7A', M.shade, 0.2)}"/>`; s += `<rect x="-10" y="${hz + 150}" width="${W + 20}" height="20" fill="${M.light}" opacity=".5"/>`; }
  if (sub === 'stony' || sub === 'peak') for (let i = 0; i < 40; i++) { const y = r.range(hz + 160, H), k = (y - hz) / 300; s += `<ellipse cx="${S.f1(r.range(0, W))}" cy="${S.f1(y)}" rx="${S.f1(r.range(10, 34) * k)}" ry="${S.f1(r.range(6, 16) * k)}" fill="${r.pick(['#D9D3C7', '#B8B0A2', '#9E968A', '#E8E2D6'])}"/>`; }
  if (sub === 'ghat') { s += `<path d="M-20 600L520 600L760 ${H + 5}H-20Z" fill="${mix('#C9B49A', M.shade, 0.15)}"/>`; for (let k = 0; k < 6; k++) s += `<rect x="-20" y="${600 + k * 34}" width="${560 + k * 40}" height="5" fill="${M.shade}" opacity=".15"/>`; }
  if (sub === 'truss-bridge') s += A.trussBridge(600, hz + 20, 1, tone({ wall: '#5E6E7A', dark: '#3E4A52' }, M, mood), 5);
  if (sub === 'cable-bridge') s += A.cableBridge(600, hz + 40, 1, tone({ wall: '#E8E4DC', dark: '#5E5852' }, M, mood));
  const nb = sub === 'port' ? 6 : sub === 'lilies' ? 1 : r.int(2, 4);
  for (let i = 0; i < nb; i++) { const y = r.range(hz + 60, H - 40), k = 0.5 + (y - hz) / 400; s += S.boat(r.range(80, 1120), y, k, M, r, sub === 'port' ? { sail: false, roof: true } : {}); }
  return s;
}

function teaScene(p, sub, M, mood, r) {
  let s = S.sky(M, r, { sunY: r.range(120, 230) });
  const tea = mix('#3F8F45', M.shade, mood === 'dusk' ? 0.4 : 0.08), row = mix(tea, '#1E5A2A', 0.5);
  if (sub === 'flat') {
    s += `<path d="M560 420L720 200L800 280L880 190L1080 420Z" fill="${S.far(M, '#C9D6E2', 0.4)}"/><path d="M680 255L720 200L800 280L880 190L930 255L870 240L800 300L740 250Z" fill="#fff"/>`;
    s += S.canopyRow(r, { y: 440, h: 30, col: S.far(M, M.green[1], 0.5) }) + `<rect y="430" width="${W}" height="380" fill="${tea}"/>`;
    for (let i = 0; i < 22; i++) { const y = 440 + i ** 1.5 * 3.4; s += `<path d="M-20 ${S.f1(y)}H${W + 20}" stroke="${row}" stroke-width="${S.f1(2 + i * 0.6)}" opacity=".7"/>`; }
  } else {
    for (let L = 0; L < 3; L++) {
      const pts = S.ridgePts(r, { y: 430 + L * 120, amp: 90, step: 220, jag: 0.5 });
      s += S.ground(pts, S.far(M, tea, 0.45 - L * 0.2));
      for (let k = 1; k < 9; k++) s += `<path d="${S.smooth(pts.map(([x, y]) => [x, y + k * (14 + L * 6)]))}" fill="none" stroke="${row}" stroke-width="${3 + L * 2}" opacity="${0.4 + L * 0.15}"/>`;
    }
  }
  for (let i = 0; i < 6; i++) { const x = r.range(40, 1160), y = r.range(500, 720), h = 140 + (y - 500); s += `<path d="M${S.f1(x)} ${S.f1(y)}V${S.f1(y - h)}" stroke="${mix('#6B5A48', M.shade, 0.2)}" stroke-width="5"/><ellipse cx="${S.f1(x)}" cy="${S.f1(y - h)}" rx="${S.f1(h * 0.35)}" ry="${S.f1(h * 0.1)}" fill="${mix(M.green[1], M.shade, 0.1)}"/><ellipse cx="${S.f1(x)}" cy="${S.f1(y - h - h * 0.04)}" rx="${S.f1(h * 0.25)}" ry="${S.f1(h * 0.07)}" fill="${mix(M.green[0], M.shade, 0.05)}"/>`; }
  for (let i = 0; i < 3; i++) s += S.person(r.range(300, 900), r.range(690, 760), 1.7, r.pick(['#C2185B', '#E2483A', '#F2A541']));
  return s;
}

function villageScene(p, sub, M, mood, r) {
  let s = S.sky(M, r, { sunY: r.range(130, 240) });
  s += S.canopyRow(r, { y: 470, h: 50, col: S.far(M, M.green[1], 0.5) });
  const fieldCol = { flowers: '#3F8F45', mustard: '#E9C23A', paddy: '#7DBE4E', corridor: '#7DBE4E', weaving: '#8CC56A', mango: '#6FA65A', floating: M.water[0] }[sub] ?? '#7DBE4E';
  if (sub === 'floating') {
    s += S.water(M, r, { y: 470, ripples: 8 });
    for (let i = 0; i < 10; i++) { const y = r.range(520, 760), k = 0.5 + (y - 470) / 300, x = r.range(60, 1140); s += S.boat(x, y, k, M, r, { sail: false, roof: false }); for (let g = 0; g < 8; g++) s += `<circle cx="${S.f1(x + r.range(-30, 30) * k)}" cy="${S.f1(y - r.range(12, 24) * k)}" r="${S.f1(8 * k)}" fill="${mix('#9CCB4A', M.shade, 0.15)}"/>`; }
    return s + S.canopyRow(r, { y: 520, h: 60, col: M.green[2], x0: -40, x1: 200 });
  }
  s += `<rect y="470" width="${W}" height="340" fill="${mix(fieldCol, M.shade, mood === 'dusk' ? 0.35 : 0.05)}"/>`;
  for (let i = 0; i < 16; i++) { const y = 480 + i ** 1.6 * 2.6; s += `<path d="M-20 ${S.f1(y)}H${W + 20}" stroke="${mix(fieldCol, '#1E5A2A', 0.35)}" stroke-width="${S.f1(1 + i * 0.4)}" opacity=".45"/>`; }
  if (sub === 'flowers' || sub === 'mustard') for (let i = 0; i < 380; i++) { const y = r.range(480, H), k = (y - 470) / 330; s += `<circle cx="${S.f1(r.range(0, W))}" cy="${S.f1(y)}" r="${S.f1(1.5 + k * 7)}" fill="${sub === 'mustard' ? r.pick(['#F7D54A', '#F2C230', '#FFE680']) : r.pick(['#E2483A', '#D93A6A', '#F28AA6', '#E2483A', '#F6E7D8'])}"/>`; }
  if (sub === 'mango') for (let i = 0; i < 5; i++) { const x = 120 + i * 240 + r.range(-30, 30), y = r.range(620, 700); s += S.roundTree(x, y, r.range(230, 300), mix(M.green[2], M.shade, 0.1), r); for (let m = 0; m < 12; m++) s += `<ellipse cx="${S.f1(x + r.range(-70, 70))}" cy="${S.f1(y - r.range(120, 230))}" rx="6" ry="9" fill="#F2A541"/>`; }
  if (sub === 'weaving') { for (let L = 0; L < 3; L++) { const y = 560 + L * 60; s += `<path d="M80 ${y}H1120" stroke="${M.shade}" stroke-width="2"/>`; for (let i = 0; i < 9; i++) s += `<rect x="${110 + i * 112 + L * 20}" y="${y}" width="70" height="${S.f1(r.range(60, 90))}" fill="${r.pick(['#E2483A', '#2E86A8', '#F2A541', '#7B2D5B', '#0E6B4E', '#F6F1E8'])}"/>`; } }
  if (sub === 'corridor') s += `<path d="M560 470L640 470L900 ${H + 5}H300Z" fill="${mix('#9A9690', M.shade, 0.15)}"/><path d="M600 470V${H}" stroke="#F2E6C8" stroke-width="4" stroke-dasharray="20 20"/>`;
  if (['paddy', 'flowers', 'mustard', 'corridor', 'weaving'].includes(sub)) {
    const P = tone(BASE.mud, M, mood);
    s += A.hut(r.range(150, 330), 520, 0.8, P, { tin: r() < 0.5 }) + A.hut(r.range(850, 1050), 515, 0.7, P, { tin: true });
    for (let i = 0; i < 4; i++) s += S.palm(r.range(0, W), 500, r.range(150, 230), mix(M.green[2], M.shade, 0.1), r);
  }
  return s + S.person(r.range(300, 900), r.range(700, 770), 1.7, mix(M.shade, '#000', 0.2));
}

function cityScene(p, sub, M, mood, r) {
  const hz = r.range(450, 500);
  let s = S.sky(M, r, { sunY: hz - r.range(120, 220) });
  if (sub === 'hill-lake') for (let i = 0; i < 2; i++) s += S.ridge(r, M, { y: hz - 80 + i * 40, amp: 70, step: 160, t: 0.6 - i * 0.2 });
  if (sub === 'museum') { s += S.water(M, r, { y: hz + 60 }); return s + A.museum(600, hz + 40, 1.2, tone(BASE.white, M, mood)) + S.boat(r.range(200, 1000), 680, 1, M, r); }
  s += S.water(M, r, { y: hz });
  s += S.canopyRow(r, { y: hz + 6, h: 60, col: S.far(M, M.green[1], 0.3) });
  if (sub === 'dighi') { s += `<path d="M-20 ${H}L300 ${hz + 120}H900L1220 ${H}Z" fill="none"/>`; for (let k = 0; k < 5; k++) s += `<rect x="440" y="${hz + 110 + k * 22}" width="${320 + k * 40}" height="10" transform="translate(${-k * 20} 0)" fill="${mix('#C9B49A', M.shade, 0.15)}"/>`; }
  for (let i = 0; i < 3; i++) s += S.roundTree(r.range(0, 260), r.range(hz + 160, H), r.range(220, 320), mix(M.green[2], M.shade, 0.1), r);
  return s + S.boat(r.range(500, 1000), r.range(hz + 80, H - 60), 0.9, M, r);
}

const SCENES = { arch: archScene, hill: hillScene, beach: beachScene, island: islandScene, waterfall: waterfallScene, forest: forestScene, river: riverScene, tea: teaScene, village: villageScene, city: cityScene };

// ---------- run ----------
const places = read('places.json');
if (only === '--list') {
  const seen = {};
  for (const p of places) { const [sc, v] = classify(p); (seen[sc + '/' + v] ??= []).push(p.slug); }
  console.log(JSON.stringify(seen));
  process.exit(0);
}
const index = [];
let done = 0;
for (const p of places) {
  if (only && !only.split(',').includes(p.slug)) continue;
  const r = rng('cover-' + p.slug);
  const mood = S.pickMood(r, p.best_from_month), M = MOODS[mood];
  const [scene, sub] = classify(p);
  const body = SCENES[scene](p, sub, M, mood, r, (p.name_en + ' ' + p.slug).toLowerCase()) + S.vignette() + S.grain(0.07);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(`Illustration: ${p.name_en}`)}">${body}</svg>\n`;
  write(`places/svg/${p.slug}.svg`, svg);
  await saveWebp(svg, `places/w1200/${p.slug}.webp`, 1200, 80);
  await saveWebp(svg, `places/w640/${p.slug}.webp`, 640, 78);
  index.push({ slug: p.slug, scene, variant: sub, mood, svg: `svg/${p.slug}.svg`, w640: `w640/${p.slug}.webp`, w1200: `w1200/${p.slug}.webp` });
  if (++done % 25 === 0) console.log(done, 'covers');
}
if (!only) fs.writeFileSync(path.join(OUT, 'places/index.json'), JSON.stringify(index, null, 1) + '\n');
console.log('covers:', done);
