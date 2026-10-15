/**
 * The browser half of the upload pipeline. Every photo is decoded and drawn onto a canvas, then
 * re-encoded (WebP, or JPEG where the browser cannot write WebP) at most 2000 px on its longest
 * side, with a 480 px thumbnail next to it. A canvas holds pixels only, so EXIF — GPS position,
 * camera, time — is gone before anything is sent; as a last check the bytes are scanned and any
 * metadata block left is removed. The original file never leaves the device.
 *
 * Orientation: the photo is decoded with its EXIF rotation applied, so it still looks the right
 * way up once the rotation tag is gone.
 */
import {
  ORIGINAL_BYTES_MAX,
  PHOTO_BYTES_MAX,
  PHOTO_SIDE_MAX,
  THUMB_BYTES_MAX,
  THUMB_SIDE,
} from "@/lib/community/rules";
import { sniffImage, stripMetadata, type ImageType } from "./image-bytes";

export type PreparedImage = {
  /** The re-encoded photo (what is uploaded). */
  photo: Blob;
  thumb: Blob;
  width: number;
  height: number;
  type: ImageType;
  /** The original file name, for labels only (it is not sent). */
  name: string;
};

export type PrepareErrorCode = "not_image" | "too_large" | "decode" | "encode";

export class PrepareImageError extends Error {
  constructor(public code: PrepareErrorCode) {
    super(code);
    this.name = "PrepareImageError";
  }
}

export type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

export type PipelineDeps = {
  decode: (file: Blob) => Promise<DecodedImage>;
  /** Draws `image` at `width`×`height` and encodes it; the blob's type is what the browser made. */
  encode: (
    image: DecodedImage,
    width: number,
    height: number,
    type: ImageType,
    quality: number,
  ) => Promise<Blob>;
};

/** Scales `width`×`height` down (never up) so the longest side is at most `max`. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function browserDecode(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function browserEncode(
  image: DecodedImage,
  width: number,
  height: number,
  type: ImageType,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PrepareImageError("encode");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (type === "image/jpeg") {
    // JPEG has no transparency: put transparent pixels on white, not black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(image.source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new PrepareImageError("encode");
  return blob;
}

export const BROWSER_PIPELINE: PipelineDeps = { decode: browserDecode, encode: browserEncode };

const LOOKS_LIKE_IMAGE = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;

/**
 * Re-encodes the canvas output once more through the byte check: it must be a JPEG or WebP we
 * recognise, and any metadata block (there should be none) is removed.
 */
async function clean(blob: Blob): Promise<{ blob: Blob; type: ImageType }> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const info = sniffImage(bytes);
  const stripped = info && stripMetadata(bytes);
  if (!info || !stripped) throw new PrepareImageError("encode");
  return { blob: new Blob([stripped as BlobPart], { type: info.type }), type: info.type };
}

async function encodeBest(
  deps: PipelineDeps,
  image: DecodedImage,
  width: number,
  height: number,
  qualities: number[],
  maxBytes: number,
): Promise<{ blob: Blob; type: ImageType }> {
  let type: ImageType = "image/webp";
  let last: Blob | null = null;
  for (const quality of qualities) {
    last = await deps.encode(image, width, height, type, quality);
    if (last.type !== "image/webp" && type === "image/webp") {
      // This browser cannot write WebP (it fell back to PNG): use JPEG from here on.
      type = "image/jpeg";
      last = await deps.encode(image, width, height, type, quality);
    }
    if (last.size <= maxBytes) return clean(last);
  }
  throw new PrepareImageError("too_large");
}

/** Shrinks, re-encodes and thumbnails one photo in the browser. */
export async function prepareImage(
  file: File,
  deps: PipelineDeps = BROWSER_PIPELINE,
): Promise<PreparedImage> {
  if (!file.type.startsWith("image/") && !LOOKS_LIKE_IMAGE.test(file.name)) {
    throw new PrepareImageError("not_image");
  }
  if (file.size > ORIGINAL_BYTES_MAX) throw new PrepareImageError("too_large");
  let image: DecodedImage;
  try {
    image = await deps.decode(file);
  } catch {
    throw new PrepareImageError("decode");
  }
  try {
    if (!image.width || !image.height) throw new PrepareImageError("decode");
    let size = fitWithin(image.width, image.height, PHOTO_SIDE_MAX);
    let photo: { blob: Blob; type: ImageType } | null = null;
    for (let attempt = 0; attempt < 3 && !photo; attempt++) {
      try {
        photo = await encodeBest(
          deps,
          image,
          size.width,
          size.height,
          [0.86, 0.76, 0.64],
          PHOTO_BYTES_MAX,
        );
      } catch (error) {
        if (!(error instanceof PrepareImageError) || error.code !== "too_large") throw error;
        size = fitWithin(
          size.width,
          size.height,
          Math.round(Math.max(size.width, size.height) * 0.75),
        );
      }
    }
    if (!photo) throw new PrepareImageError("too_large");
    const t = fitWithin(image.width, image.height, THUMB_SIDE);
    const thumb = await encodeBest(
      deps,
      image,
      t.width,
      t.height,
      [0.75, 0.6, 0.45],
      THUMB_BYTES_MAX,
    );
    return {
      photo: photo.blob,
      thumb: thumb.blob,
      width: size.width,
      height: size.height,
      type: photo.type,
      name: file.name,
    };
  } catch (error) {
    throw error instanceof PrepareImageError ? error : new PrepareImageError("encode");
  } finally {
    image.close?.();
  }
}

/** Adds prepared photos to a form as `photo` / `thumb` pairs (in order). */
export function appendImages(form: FormData, images: PreparedImage[]): FormData {
  images.forEach((img, i) => {
    const ext = img.type === "image/webp" ? "webp" : "jpg";
    form.append("photo", img.photo, `photo-${i + 1}.${ext}`);
    form.append("thumb", img.thumb, `thumb-${i + 1}.${ext}`);
  });
  return form;
}
