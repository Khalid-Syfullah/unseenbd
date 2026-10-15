// Bangladesh district/division maps, per-district locator maps and silhouettes, and a world map.
// Sources: OCHA/BBS COD-AB Bangladesh (CC BY-IGO) and Natural Earth 1:50m (public domain).
import fs from 'node:fs';
import path from 'node:path';
import { geoMercator, geoPath, geoContains, geoArea, geoEqualEarth, geoCentroid, geoBounds } from 'd3-geo';
import { HERE, C, read, write, textPath, svgDoc, r2, esc, DIVISION_COLORS } from './lib.mjs';

const geo = (f) => JSON.parse(fs.readFileSync(path.join(HERE, 'geo', f), 'utf8'));
const districts = read('districts.json');
const divisions = read('divisions.json');



// d3 wants clockwise exterior rings; flip any feature that came out "inside-out"
function rewind(fc) {
  for (const f of fc.features) {
    if (geoArea(f) > 2 * Math.PI) {
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      polys.forEach((p) => p.forEach((ring) => ring.reverse()));
    }
  }
  return fc;
}

// ---------- match COD-AB districts to our 64 district records ----------
const adm2 = rewind(geo('bgd-districts.geojson'));
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const ALIAS = { chittagong: 'chattogram', comilla: 'cumilla', barisal: 'barishal', bogra: 'bogura', jessore: 'jashore',
  nawabganj: 'chapainawabganj', chapainababganj: 'chapainawabganj', maulvibazar: 'moulvibazar', netrakona: 'netrokona',
  jhalokati: 'jhalokathi', khagrachari: 'khagrachhari', brahamanbaria: 'brahmanbaria', coxsbazar: 'coxsbazar' };
const bySlugNorm = new Map(districts.map((d) => [norm(d.slug), d]));
const matched = new Map();
for (const f of adm2.features) {
  const n = norm(f.properties.adm2_name);
  let d = bySlugNorm.get(ALIAS[n] ?? n);
  if (!d) d = districts.find((x) => geoContains(f, [x.lng, x.lat]));
  if (!d) throw new Error('No match for ' + f.properties.adm2_name);
  if (matched.has(d.slug)) throw new Error('Duplicate match ' + d.slug);
  matched.set(d.slug, f);
}
if (matched.size !== 64) throw new Error('matched ' + matched.size);

// ---------- national map ----------
const W = 600, H = 760, PAD = 16;
const proj = geoMercator().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], adm2);
const pathGen = geoPath(proj).digits(1);
const adm1 = rewind(geo('bgd-divisions.geojson'));
const divSlug = (name) => norm(name) === 'chittagong' ? 'chattogram' : norm(name) === 'barisal' ? 'barishal' : norm(name);

function largestPolygon(f) {
  const g = f.geometry;
  if (g.type === 'Polygon') return f;
  let best = null, area = -1;
  for (const coords of g.coordinates) {
    const p = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } };
    const a = geoArea(p);
    if (a > area) { area = a; best = p; }
  }
  return best;
}

const json = { viewBox: `0 0 ${W} ${H}`, source: 'OCHA/BBS COD-AB Bangladesh (CC BY-IGO), simplified', districts: [], divisions: [] };
for (const d of districts) {
  const f = matched.get(d.slug);
  const [cx, cy] = pathGen.centroid(largestPolygon(f));
  const [[x0, y0], [x1, y1]] = pathGen.bounds(f);
  json.districts.push({ id: d.id, slug: d.slug, name_en: d.name_en, name_bn: d.name_bn, division: d.division,
    d: pathGen(f), label: [r2(cx), r2(cy)], bbox: [r2(x0), r2(y0), r2(x1), r2(y1)] });
}
for (const f of adm1.features) {
  const slug = divSlug(f.properties.adm1_name);
  const div = divisions.find((v) => v.slug === slug);
  if (!div) throw new Error('division ' + f.properties.adm1_name);
  const [cx, cy] = pathGen.centroid(largestPolygon(f));
  json.divisions.push({ slug, name_en: div.name_en, name_bn: div.name_bn, d: pathGen(f), label: [r2(cx), r2(cy)] });
}
write('maps/bangladesh.json', JSON.stringify(json) + '\n');

const STYLE = `<style>
  .district{fill:${C.sand};stroke:#fff;stroke-width:.8;stroke-linejoin:round;cursor:pointer;transition:fill .15s}
  .district:hover{fill:${C.moss}}
  .district.visited,.district[aria-pressed="true"]{fill:${C.forest}}
  .division-line{fill:none;stroke:${C.ink};stroke-opacity:.35;stroke-width:1.4;pointer-events:none}
</style>`;
const districtPaths = json.districts.map((x) =>
  `<path id="d-${x.slug}" class="district" data-id="${x.id}" data-slug="${x.slug}" data-division="${x.division}" d="${x.d}"><title>${esc(x.name_en)} · ${x.name_bn}</title></path>`).join('\n');
const divisionLines = json.divisions.map((x) => `<path class="division-line" data-division="${x.slug}" d="${x.d}"/>`).join('\n');

write('maps/bangladesh-districts.svg', svgDoc(W, H,
  `${STYLE}<g id="districts">\n${districtPaths}\n</g><g id="division-borders">\n${divisionLines}\n</g>`,
  ' role="img" aria-label="Map of the 64 districts of Bangladesh"'));

for (const lang of ['en', 'bn']) {
  const labels = json.districts.map((x) => {
    const name = lang === 'en' ? x.name_en : x.name_bn;
    const w = x.bbox[2] - x.bbox[0];
    const size = Math.max(6.5, Math.min(10.5, w / (name.length * 0.55)));
    return `<path d="${textPath(name, { font: 'sansSemi', size, x: x.label[0], y: x.label[1] + size * 0.35, anchor: 'middle', digits: 1 }).d}"/>`;
  }).join('');
  write(`maps/bangladesh-districts-labelled-${lang}.svg`, svgDoc(W, H,
    `${STYLE}<g id="districts">\n${districtPaths}\n</g><g id="division-borders">\n${divisionLines}\n</g><g id="labels" fill="${C.ink}" fill-opacity=".8" pointer-events="none">${labels}</g>`,
    ` role="img" aria-label="Map of the 64 districts of Bangladesh with ${lang === 'en' ? 'English' : 'Bengali'} labels"`));
}

const divFill = json.divisions.map((x) =>
  `<path id="v-${x.slug}" class="division" data-slug="${x.slug}" fill="${DIVISION_COLORS[x.slug]}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" d="${x.d}"><title>${esc(x.name_en)} · ${x.name_bn}</title></path>`).join('\n');
write('maps/bangladesh-divisions.svg', svgDoc(W, H, `<g id="divisions">\n${divFill}\n</g>`, ' role="img" aria-label="Map of the 8 divisions of Bangladesh"'));
for (const lang of ['en', 'bn']) {
  const labels = json.divisions.map((x) => {
    const name = lang === 'en' ? x.name_en : x.name_bn;
    return `<path d="${textPath(name, { font: 'sansBold', size: 17, x: x.label[0], y: x.label[1] + 6, anchor: 'middle', digits: 1 }).d}"/>`;
  }).join('');
  write(`maps/bangladesh-divisions-labelled-${lang}.svg`, svgDoc(W, H,
    `<g id="divisions">\n${divFill}\n</g><g fill="#fff" stroke="${C.ink}" stroke-opacity=".35" stroke-width=".6" paint-order="stroke">${labels}</g>`,
    ` role="img" aria-label="Map of the 8 divisions of Bangladesh"`));
}

// ---------- per-district locator maps (coarser geometry, same projection) ----------
const coarse = rewind(geo('bgd-districts-coarse.geojson'));
const coarsePath = geoPath(proj).digits(0);
const coarseD = new Map();
for (const f of coarse.features) {
  const n = norm(f.properties.adm2_name);
  const d = bySlugNorm.get(ALIAS[n] ?? n) ?? districts.find((x) => geoContains(f, [x.lng, x.lat]));
  coarseD.set(d.slug, coarsePath(f));
}
const base = `<g fill="#E7E1D3" stroke="#fff" stroke-width="1">` + json.districts.map((x) => `<path d="${coarseD.get(x.slug)}"/>`).join('') + '</g>';
for (const x of json.districts) {
  const divTint = `<g fill="${DIVISION_COLORS[x.division]}" fill-opacity=".3" stroke="#fff" stroke-width="1">` + json.districts
    .filter((y) => y.division === x.division && y.slug !== x.slug).map((y) => `<path d="${coarseD.get(y.slug)}"/>`).join('') + '</g>';
  write(`maps/districts/${x.slug}.svg`, svgDoc(W, H,
    `${base}${divTint}<path d="${x.d}" fill="${C.forest}" stroke="${C.ink}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<circle cx="${x.label[0]}" cy="${x.label[1]}" r="6" fill="${C.sun}" stroke="#fff" stroke-width="2"/>`,
    ` role="img" aria-label="${x.name_en} district, ${x.division} division"`));
}

// ---------- per-district silhouettes (photo-clue game) ----------
for (const d of districts) {
  const f = matched.get(d.slug);
  const S = 512, p = 36;
  const pr = geoMercator().fitExtent([[p, p], [S - p, S - p]], f);
  write(`maps/silhouettes/${d.slug}.svg`, svgDoc(S, S,
    `<path d="${geoPath(pr).digits(1)(f)}" fill="${C.clay}" stroke="${C.ink}" stroke-opacity=".25" stroke-width="2" stroke-linejoin="round"/>`,
    ' role="img" aria-label="District outline"'));
}

// ---------- outline of the whole country (for hero art, cards, loaders) ----------
const outline = json.divisions.map((x) => x.d).join('');
write('maps/bangladesh-outline.svg', svgDoc(W, H, `<path d="${outline}" fill="${C.forest}"/>`, ' role="img" aria-label="Outline of Bangladesh"'));

// ---------- world ----------
const world = rewind(geo('world-countries.geojson'));
world.features = world.features.filter((f) => f.properties.ISO_A3_EH !== 'ATA');
const WW = 1000, WH = 500;
const wproj = geoEqualEarth().fitExtent([[8, 8], [WW - 8, WH - 8]], world);
const wpath = geoPath(wproj).digits(1);
const countries = world.features.map((f) => {
  const p = f.properties;
  const iso2 = p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : null;
  const iso3 = p.ISO_A3_EH !== '-99' ? p.ISO_A3_EH : null;
  const c = geoCentroid(f);
  return { iso2, iso3, name_en: p.NAME, name_bn: p.NAME_BN, continent: p.CONTINENT,
    sovereign: p.TYPE === 'Sovereign country' || p.TYPE === 'Country', centroid: [r2(c[0]), r2(c[1])], d: wpath(f) };
}).sort((a, b) => a.name_en.localeCompare(b.name_en));
write('maps/world.json', JSON.stringify({ viewBox: `0 0 ${WW} ${WH}`, projection: 'Equal Earth', source: 'Natural Earth 1:50m (public domain), simplified', countries }) + '\n');
const wstyle = `<style>
  .country{fill:#DCE4EE;stroke:#fff;stroke-width:.4;cursor:pointer}
  .country:hover{fill:${C.mist}}
  .country.visited{fill:${C.forest}}
  .country.wish{fill:${C.marigold}}
</style>`;
write('maps/world-countries.svg', svgDoc(WW, WH, wstyle + '<g id="countries">\n' + countries.map((c) =>
  `<path class="country" ${c.iso2 ? `id="c-${c.iso2}" data-iso2="${c.iso2}"` : ''} data-iso3="${c.iso3 ?? ''}" data-continent="${c.continent}" d="${c.d}"><title>${esc(c.name_en)} · ${esc(c.name_bn ?? '')}</title></path>`).join('\n') + '\n</g>',
' role="img" aria-label="World map"'));

console.log(`maps: 64 districts, ${json.divisions.length} divisions, ${countries.length} world shapes (${countries.filter((c) => c.sovereign).length} countries)`);
