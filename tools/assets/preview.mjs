// Contact sheet: node preview.mjs <out.png> <cellWidth> <cols> <file.svg|png ...>
import fs from 'node:fs';
import sharp from 'sharp';
import { renderPng } from './lib.mjs';

const [out, cw = '240', cols = '4', ...files] = process.argv.slice(2);
const W = Number(cw), N = Number(cols);
const tiles = [];
for (const f of files) {
  const buf = f.endsWith('.svg') ? renderPng(fs.readFileSync(f, 'utf8'), W) : fs.readFileSync(f);
  const img = await sharp(buf).resize({ width: W, height: W, fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toBuffer();
  tiles.push(img);
}
const rows = Math.ceil(tiles.length / N), gap = 8;
const sheet = sharp({ create: { width: N * (W + gap) + gap, height: rows * (W + gap) + gap, channels: 3, background: '#d8d8d8' } });
await sheet.composite(tiles.map((t, i) => ({ input: t, left: gap + (i % N) * (W + gap), top: gap + Math.floor(i / N) * (W + gap) }))).png().toFile(out);
console.log('sheet', out, tiles.length);
