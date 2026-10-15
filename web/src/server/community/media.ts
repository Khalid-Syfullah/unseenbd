/**
 * Uploaded images on disk. The browser has already shrunk and re-encoded every photo (so EXIF and
 * GPS never leave the device); the server checks each file again — real JPEG or WebP by its
 * bytes, size and pixel limits — strips any metadata that might still be there, and stores it
 * under `MEDIA_DIR` (default `web/storage/media/`) with a random name:
 *
 *   {MEDIA_DIR}/{yyyy}/{mm}/{name}.webp      the photo (≤ 2000 px)
 *   {MEDIA_DIR}/{yyyy}/{mm}/{name}-t.webp    its thumbnail (≤ 640 px)
 *
 * Public URLs are `/media/{yyyy}/{mm}/{file}`, served by `src/app/media/[...path]/route.ts` with
 * a one-year immutable cache (names never change meaning).
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { sniffImage, stripMetadata, type ImageInfo } from "@/lib/media/image-bytes";
import {
  PHOTO_BYTES_MAX,
  PHOTO_SIDE_MAX,
  THUMB_BYTES_MAX,
  THUMB_SIDE_MAX,
} from "@/lib/community/rules";
import { mediaDir } from "../paths";

export const MEDIA_PREFIX = "/media/";

export type StoredImage = {
  src: string;
  thumb: string;
  width: number;
  height: number;
};

export type ImageCheck =
  | { ok: true; bytes: Uint8Array; info: ImageInfo }
  | { ok: false; status: 400 | 413 | 415; reason: string };

/** A file part of a form (not a string). Duck-typed, so any `Blob` implementation passes. */
function isBlob(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function" &&
    typeof (value as Blob).size === "number"
  );
}

/** Checks one uploaded file: a JPEG or WebP within the byte and pixel limits, metadata removed. */
export async function checkImage(file: Blob, role: "photo" | "thumb"): Promise<ImageCheck> {
  const maxBytes = role === "photo" ? PHOTO_BYTES_MAX : THUMB_BYTES_MAX;
  const maxSide = role === "photo" ? PHOTO_SIDE_MAX : THUMB_SIDE_MAX;
  if (file.size === 0) return { ok: false, status: 400, reason: "empty" };
  if (file.size > maxBytes) return { ok: false, status: 413, reason: "too_large" };
  const raw = new Uint8Array(await file.arrayBuffer());
  const info = sniffImage(raw);
  if (!info) return { ok: false, status: 415, reason: "not_an_image" };
  if (Math.max(info.width, info.height) > maxSide) {
    return { ok: false, status: 400, reason: "too_many_pixels" };
  }
  const bytes = stripMetadata(raw);
  if (!bytes) return { ok: false, status: 415, reason: "not_an_image" };
  return { ok: true, bytes, info };
}

/** A photo and its thumbnail, checked, as a pair (they must be the same format). */
export type ImagePair = { photo: { bytes: Uint8Array; info: ImageInfo }; thumb: Uint8Array };

/**
 * Reads `photo` / `thumb` file pairs from a multipart form (the n-th thumb belongs to the n-th
 * photo). Returns the checked pairs or the error to send.
 */
export async function readImagePairs(
  form: FormData,
  max: number,
): Promise<
  { ok: true; pairs: ImagePair[] } | { ok: false; status: 400 | 413 | 415; reason: string }
> {
  const photos = form.getAll("photo");
  const thumbs = form.getAll("thumb");
  if (photos.length > max) return { ok: false, status: 400, reason: "too_many" };
  if (thumbs.length !== photos.length) return { ok: false, status: 400, reason: "thumbs" };
  const pairs: ImagePair[] = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const t = thumbs[i];
    if (!isBlob(p) || !isBlob(t)) {
      return { ok: false, status: 400, reason: "not_a_file" };
    }
    const photo = await checkImage(p, "photo");
    if (!photo.ok) return photo;
    const thumb = await checkImage(t, "thumb");
    if (!thumb.ok) return thumb;
    pairs.push({ photo: { bytes: photo.bytes, info: photo.info }, thumb: thumb.bytes });
  }
  return { ok: true, pairs };
}

function newName(): string {
  return randomBytes(12).toString("base64url");
}

/** Writes a photo and its thumbnail; returns their public URLs and the photo's size. */
export function storeImagePair(pair: ImagePair, now = new Date()): StoredImage {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const name = newName();
  const { ext } = pair.photo.info;
  const thumbExt = sniffImage(pair.thumb)?.ext ?? ext;
  const dir = join(mediaDir(), yyyy, mm);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.${ext}`), pair.photo.bytes, { flag: "wx" });
  writeFileSync(join(dir, `${name}-t.${thumbExt}`), pair.thumb, { flag: "wx" });
  return {
    src: `${MEDIA_PREFIX}${yyyy}/${mm}/${name}.${ext}`,
    thumb: `${MEDIA_PREFIX}${yyyy}/${mm}/${name}-t.${thumbExt}`,
    width: pair.photo.info.width,
    height: pair.photo.info.height,
  };
}

const SEGMENT = /^[A-Za-z0-9_-]{1,64}(\.(webp|jpg))?$/;

/** The file behind a `/media/…` path (segments after `/media/`), or null when not allowed. */
export function mediaFile(segments: string[]): string | null {
  if (!segments.length || segments.length > 4 || !segments.every((s) => SEGMENT.test(s))) {
    return null;
  }
  if (!/\.(webp|jpg)$/.test(segments[segments.length - 1]!)) return null;
  const root = mediaDir();
  const path = resolve(root, ...segments);
  const rel = relative(root, path);
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) return null;
  return path;
}

export function readMedia(segments: string[]): { data: Buffer; type: string } | null {
  const path = mediaFile(segments);
  if (!path) return null;
  try {
    if (!statSync(path).isFile()) return null;
    return {
      data: readFileSync(path),
      type: path.endsWith(".webp") ? "image/webp" : "image/jpeg",
    };
  } catch {
    return null;
  }
}

/** Deletes stored files by their public URLs (missing files and foreign URLs are ignored). */
export function deleteMedia(srcs: (string | null | undefined)[]): void {
  for (const src of srcs) {
    if (!src?.startsWith(MEDIA_PREFIX)) continue;
    const path = mediaFile(src.slice(MEDIA_PREFIX.length).split("/"));
    if (!path) continue;
    try {
      unlinkSync(path);
    } catch {
      // already gone
    }
  }
}
