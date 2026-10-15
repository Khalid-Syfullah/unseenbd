#!/usr/bin/env node
// Copies the shared design assets from ../assets into web/public so Next.js can serve them.
// Runs on `predev` and `prebuild`. Everything it writes is generated, so it is gitignored.
//
//   ../assets/{brand,social,icons,...}   -> public/{brand,social,icons,...}
//   ../assets/brand/favicon*, apple-touch-icon.png -> public/ (site root)
//   ../assets/brand/manifest.webmanifest -> public/manifest.webmanifest (icon paths -> /brand/)
//
// Folders are mirrored: changed files are copied, unchanged files are skipped, and files
// that no longer exist in ../assets are removed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const assetsRoot = path.resolve(webRoot, "..", "assets");
const publicRoot = path.join(webRoot, "public");

export const ASSET_DIRS = [
  "brand",
  "social",
  "icons",
  "illustrations",
  "maps",
  "places",
  "stamps",
  "badges",
  "card-themes",
];

export const ROOT_FILES = [
  "favicon.ico",
  "favicon.svg",
  "favicon-16.png",
  "favicon-32.png",
  "favicon-48.png",
  "apple-touch-icon.png",
];

/** Where the PWA icons live once synced (they stay inside the brand folder). */
export const MANIFEST_ICON_BASE = "/brand/";

/** Rewrites the manifest's icon paths (written for /icons/) to where we actually serve them. */
export function fixManifest(manifest) {
  return {
    ...manifest,
    icons: (manifest.icons ?? []).map((icon) => ({
      ...icon,
      src: MANIFEST_ICON_BASE + path.posix.basename(icon.src),
    })),
  };
}

function sameFile(src, dest) {
  try {
    const a = fs.statSync(src);
    const b = fs.statSync(dest);
    return a.size === b.size && Math.abs(a.mtimeMs - b.mtimeMs) < 2;
  } catch {
    return false;
  }
}

function copyFile(src, dest, stats) {
  if (sameFile(src, dest)) {
    stats.skipped++;
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  const { atimeMs, mtimeMs } = fs.statSync(src);
  fs.utimesSync(dest, atimeMs / 1000, mtimeMs / 1000);
  stats.copied++;
}

function mirrorDir(src, dest, stats) {
  fs.mkdirSync(dest, { recursive: true });
  const wanted = new Set();
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    wanted.add(entry.name);
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) mirrorDir(from, to, stats);
    else if (entry.isFile()) copyFile(from, to, stats);
  }
  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    if (!wanted.has(entry.name)) {
      fs.rmSync(path.join(dest, entry.name), { recursive: true, force: true });
      stats.removed++;
    }
  }
}

export function syncAssets({ log = console.log } = {}) {
  if (!fs.existsSync(assetsRoot)) {
    throw new Error(`sync-assets: ${assetsRoot} not found`);
  }
  const stats = { copied: 0, skipped: 0, removed: 0 };
  fs.mkdirSync(publicRoot, { recursive: true });

  for (const dir of ASSET_DIRS) {
    const src = path.join(assetsRoot, dir);
    if (!fs.existsSync(src)) throw new Error(`sync-assets: missing ${src}`);
    mirrorDir(src, path.join(publicRoot, dir), stats);
  }

  for (const file of ROOT_FILES) {
    copyFile(path.join(assetsRoot, "brand", file), path.join(publicRoot, file), stats);
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(assetsRoot, "brand", "manifest.webmanifest"), "utf8"),
  );
  const manifestOut = JSON.stringify(fixManifest(manifest), null, 2) + "\n";
  const manifestPath = path.join(publicRoot, "manifest.webmanifest");
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, "utf8") !== manifestOut) {
    fs.writeFileSync(manifestPath, manifestOut);
    stats.copied++;
  } else {
    stats.skipped++;
  }

  log(`sync-assets: ${stats.copied} copied, ${stats.skipped} unchanged, ${stats.removed} removed`);
  return stats;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncAssets();
}
