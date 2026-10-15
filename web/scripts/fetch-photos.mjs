#!/usr/bin/env node
// Downloads the Wikimedia Commons photos listed in ../data/places.json (image_credit.source),
// converts them to WebP and writes the credits to ../data/content/photos.json.
//
//   npm run photos            fetch what is missing (safe to re-run; it resumes)
//   npm run photos -- --force fetch everything again
//   npm run photos -- --limit 5 --only nilgiri-hill   (testing)
//
// NEEDS NETWORK ACCESS (commons.wikimedia.org and upload.wikimedia.org). It is not part of
// `npm run check`, `dev` or `build`. Output:
//
//   web/storage/photos/w640/{slug}.webp     cards (gitignored; served at /photos/w640/{slug}.webp)
//   web/storage/photos/w1200/{slug}.webp    place pages
//   data/content/photos.json                [{slug, file, author, license, license_url, source}]
//
// Commons etiquette: a descriptive User-Agent, one request at a time, a pause between requests
// and retries with backoff on 429/5xx. Images are only ever fetched from Commons, never from
// unseenbd.com.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { backoffMs, commonsTitle, creditFrom, downloadUrl } from "./photos-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const dataDir = path.resolve(process.env.SEED_DATA_DIR ?? path.join(webRoot, "..", "data"));
const outRoot = path.resolve(process.env.PHOTOS_DIR ?? path.join(webRoot, "storage", "photos"));
const creditsFile = path.join(dataDir, "content", "photos.json");

const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT =
  "UnseenBD-photo-fetcher/1.0 (https://unseenbd.com; khalidsyfullah@gmail.com) node-fetch";
const PAUSE_MS = 1500;
const MAX_ATTEMPTS = 5;
const WIDTHS = [640, 1200];

const args = process.argv.slice(2);
const force = args.includes("--force");
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const limit = Number(flag("--limit") ?? Infinity);
const only = flag("--only");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt));
        continue;
      }
      throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS - 1 || String(err.message).startsWith("HTTP")) throw err;
      await sleep(backoffMs(attempt));
    }
  }
}

async function imageInfo(title) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1600",
  });
  const json = await (await request(`${API}?${params}`)).json();
  const info = json.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) throw new Error(`no image info for ${title}`);
  return info;
}

function readCredits() {
  try {
    return JSON.parse(fs.readFileSync(creditsFile, "utf8"));
  } catch {
    return [];
  }
}

function writeCredits(list) {
  fs.mkdirSync(path.dirname(creditsFile), { recursive: true });
  const sorted = [...list].sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(creditsFile, `${JSON.stringify(sorted, null, 2)}\n`);
}

const places = JSON.parse(fs.readFileSync(path.join(dataDir, "places.json"), "utf8"));
const wanted = places.filter((p) => p.image_credit?.source && (!only || p.slug === only));
const credits = new Map(readCredits().map((c) => [c.slug, c]));
const hasFiles = (slug) =>
  WIDTHS.every((w) => fs.existsSync(path.join(outRoot, `w${w}`, `${slug}.webp`)));

let done = 0;
let failed = 0;
for (const place of wanted) {
  if (done >= limit) break;
  const { slug } = place;
  if (!force && credits.has(slug) && hasFiles(slug)) continue;
  const title = commonsTitle(place.image_credit.source);
  if (!title) {
    console.warn(`skip ${slug}: not a Commons file page (${place.image_credit.source})`);
    failed++;
    continue;
  }
  try {
    const info = await imageInfo(title);
    await sleep(PAUSE_MS);
    const url = downloadUrl(info);
    if (!url) throw new Error("no download URL");
    const original = Buffer.from(await (await request(url)).arrayBuffer());
    for (const width of WIDTHS) {
      const dir = path.join(outRoot, `w${width}`);
      fs.mkdirSync(dir, { recursive: true });
      await sharp(original)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(dir, `${slug}.webp`));
    }
    const credit = creditFrom(info, place.image_credit);
    credits.set(slug, {
      slug,
      file: `${slug}.webp`,
      author: credit.author,
      license: credit.license,
      license_url: credit.license_url,
      source: place.image_credit.source,
    });
    writeCredits([...credits.values()]);
    done++;
    console.log(`ok ${slug} (${done})`);
  } catch (err) {
    failed++;
    console.warn(`FAILED ${slug}: ${err.message}`);
  }
  await sleep(PAUSE_MS);
}
console.log(`done: ${done} fetched, ${failed} failed, ${credits.size} credited in total`);
if (failed) process.exitCode = 1;
