/**
 * Byte-level helpers for the two image formats the upload pipeline produces (JPEG and WebP).
 * Pure functions on `Uint8Array`, shared by the browser (a last check before upload) and the
 * server (validation, and stripping metadata again so nothing slips through).
 *
 * - `sniffImage` recognises the format from its magic bytes (never from a file name or a
 *   client-sent MIME type) and reads the pixel size from the headers.
 * - `stripMetadata` removes everything that can carry location or camera data: EXIF, XMP, IPTC,
 *   comments, JPEG multi-picture extras (MPF) and anything after the end of the image.
 */

export type ImageType = "image/jpeg" | "image/webp";

export type ImageInfo = {
  type: ImageType;
  ext: "jpg" | "webp";
  width: number;
  height: number;
};

const ascii = (b: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...b.subarray(start, start + length));

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32le = (b: Uint8Array, i: number) =>
  (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0;

function isJpeg(b: Uint8Array) {
  return b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function isWebp(b: Uint8Array) {
  return b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP";
}

/* -- JPEG ----------------------------------------------------------------------------------- */

/** Start-of-frame markers (baseline, progressive, lossless …), which carry the size. */
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

type JpegSegment = { marker: number; start: number; end: number };

/**
 * Walks the marker segments up to the first scan. Returns the segments, where the scan data
 * starts, and the end of the image (just after the first EOI), or null when malformed.
 */
function walkJpeg(
  b: Uint8Array,
): { segments: JpegSegment[]; scanStart: number; imageEnd: number } | null {
  const segments: JpegSegment[] = [];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    let marker = b[i + 1]!;
    // Fill bytes: any number of 0xFF before a marker.
    while (marker === 0xff && i + 2 < b.length) {
      i += 1;
      marker = b[i + 1]!;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    if (marker === 0xd9) return null; // EOI before any scan: no image data
    const length = u16be(b, i + 2);
    if (length < 2 || i + 2 + length > b.length) return null;
    const segment = { marker, start: i, end: i + 2 + length };
    segments.push(segment);
    if (marker === 0xda) {
      // Entropy-coded data follows. Inside it every 0xFF is followed by 0x00 or a restart
      // marker, and between progressive scans come whole segments, so the first FF D9 is EOI.
      for (let j = segment.end; j + 1 < b.length; j++) {
        if (b[j] === 0xff && b[j + 1] === 0xd9) {
          return { segments, scanStart: segment.end, imageEnd: j + 2 };
        }
      }
      return null; // truncated
    }
    i = segment.end;
  }
  return null;
}

function jpegSize(b: Uint8Array, segments: JpegSegment[]) {
  const sof = segments.find((s) => SOF.has(s.marker));
  if (!sof || sof.end - sof.start < 9) return null;
  return { height: u16be(b, sof.start + 5), width: u16be(b, sof.start + 7) };
}

/** APP0 JFIF, APP2 ICC profile and APP14 Adobe are kept (colour); every other APPn and COM go. */
function keepJpegSegment(b: Uint8Array, s: JpegSegment): boolean {
  const { marker } = s;
  if (marker === 0xfe) return false; // COM
  if (marker < 0xe0 || marker > 0xef) return true; // not APPn: tables, frame, scan …
  const id = ascii(b, s.start + 4, Math.min(12, s.end - s.start - 4));
  if (marker === 0xe0) return id.startsWith("JFIF\0");
  if (marker === 0xe2) return id.startsWith("ICC_PROFILE\0");
  if (marker === 0xee) return id.startsWith("Adobe");
  return false; // APP1 (EXIF, XMP), APP13 (IPTC), APP2 MPF, …
}

/* -- WebP ----------------------------------------------------------------------------------- */

type WebpChunk = { fourcc: string; start: number; dataStart: number; size: number; end: number };

function walkWebp(b: Uint8Array): WebpChunk[] | null {
  const riffEnd = Math.min(b.length, 8 + u32le(b, 4));
  const chunks: WebpChunk[] = [];
  let i = 12;
  while (i + 8 <= riffEnd) {
    const fourcc = ascii(b, i, 4);
    const size = u32le(b, i + 4);
    const dataStart = i + 8;
    const end = dataStart + size + (size % 2);
    if (dataStart + size > riffEnd) return null;
    chunks.push({ fourcc, start: i, dataStart, size, end: Math.min(end, riffEnd) });
    i = end;
  }
  return chunks.length ? chunks : null;
}

function webpSize(b: Uint8Array, chunks: WebpChunk[]) {
  const first = chunks[0]!;
  const d = first.dataStart;
  if (first.fourcc === "VP8X" && first.size >= 10) {
    return { width: 1 + u24le(b, d + 4), height: 1 + u24le(b, d + 7) };
  }
  if (first.fourcc === "VP8 " && first.size >= 10) {
    if (b[d + 3] !== 0x9d || b[d + 4] !== 0x01 || b[d + 5] !== 0x2a) return null;
    return {
      width: (b[d + 6]! | (b[d + 7]! << 8)) & 0x3fff,
      height: (b[d + 8]! | (b[d + 9]! << 8)) & 0x3fff,
    };
  }
  if (first.fourcc === "VP8L" && first.size >= 5) {
    if (b[d] !== 0x2f) return null;
    const bits = u32le(b, d + 1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

const WEBP_KEEP = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP"]);

/* -- public API ----------------------------------------------------------------------------- */

/** The format and pixel size of a JPEG or WebP image, or null for anything else. */
export function sniffImage(bytes: Uint8Array): ImageInfo | null {
  if (isJpeg(bytes)) {
    const walked = walkJpeg(bytes);
    const size = walked && jpegSize(bytes, walked.segments);
    if (!size || !size.width || !size.height) return null;
    return { type: "image/jpeg", ext: "jpg", ...size };
  }
  if (isWebp(bytes)) {
    const chunks = walkWebp(bytes);
    const size = chunks && webpSize(bytes, chunks);
    if (!size || !size.width || !size.height) return null;
    return { type: "image/webp", ext: "webp", ...size };
  }
  return null;
}

/**
 * A copy of the image without metadata (see the file comment), or null when it is not a
 * well-formed JPEG or WebP. The pixels are untouched.
 */
export function stripMetadata(bytes: Uint8Array): Uint8Array | null {
  if (isJpeg(bytes)) {
    const walked = walkJpeg(bytes);
    if (!walked) return null;
    const parts: Uint8Array[] = [Uint8Array.of(0xff, 0xd8)];
    for (const s of walked.segments) {
      if (keepJpegSegment(bytes, s)) parts.push(bytes.subarray(s.start, s.end));
    }
    parts.push(bytes.subarray(walked.scanStart, walked.imageEnd));
    return concat(parts);
  }
  if (isWebp(bytes)) {
    const chunks = walkWebp(bytes);
    if (!chunks) return null;
    const kept = chunks.filter((c) => WEBP_KEEP.has(c.fourcc));
    const body = concat(kept.map((c) => bytes.slice(c.start, c.end)));
    if (kept[0]?.fourcc === "VP8X") body[8] = body[8]! & ~(0x08 | 0x04); // EXIF and XMP flags off
    const out = new Uint8Array(12 + body.length);
    out.set(bytes.subarray(0, 4), 0); // "RIFF"
    const size = 4 + body.length;
    out[4] = size & 0xff;
    out[5] = (size >>> 8) & 0xff;
    out[6] = (size >>> 16) & 0xff;
    out[7] = (size >>> 24) & 0xff;
    out.set(bytes.subarray(8, 12), 8); // "WEBP"
    out.set(body, 12);
    return out;
  }
  return null;
}

/** True when the bytes still contain an EXIF or XMP block (used by tests and a client check). */
export function hasMetadata(bytes: Uint8Array): boolean {
  if (isJpeg(bytes)) {
    const walked = walkJpeg(bytes);
    if (!walked) return true;
    return (
      walked.segments.some((s) => !keepJpegSegment(bytes, s)) || walked.imageEnd < bytes.length
    );
  }
  if (isWebp(bytes)) {
    const chunks = walkWebp(bytes);
    return !chunks || chunks.some((c) => !WEBP_KEEP.has(c.fourcc));
  }
  return true;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
