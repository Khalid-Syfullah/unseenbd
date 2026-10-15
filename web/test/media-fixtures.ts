/**
 * Image bytes for upload tests: a real (tiny) JPEG made by macOS `sips`, and helpers that add a
 * GPS EXIF block, change the pixel size in the header, or build a WebP with metadata chunks.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const TINY_JPEG = new Uint8Array(readFileSync(join(__dirname, "fixtures/tiny.jpg")));

/** Text that sits inside the GPS block, so tests can check it never reaches the disk. */
export const GPS_MARKER = "GPS-23.8103N-90.4125E";

/** An APP1 "Exif" segment whose TIFF data has a GPS IFD with a latitude. */
export function gpsExifSegment(): Uint8Array {
  const tiff: number[] = [];
  const u16 = (n: number) => tiff.push((n >> 8) & 0xff, n & 0xff);
  const u32 = (n: number) =>
    tiff.push((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
  tiff.push(0x4d, 0x4d); // "MM", big endian
  u16(42);
  u32(8); // IFD0 offset
  // IFD0: one entry, GPSInfo → offset 26
  u16(1);
  u16(0x8825);
  u16(4);
  u32(1);
  u32(26);
  u32(0); // no next IFD
  // GPS IFD at 26: GPSLatitudeRef "N", GPSLatitude → offset 56
  u16(2);
  u16(0x0001);
  u16(2);
  u32(2);
  tiff.push(0x4e, 0, 0, 0);
  u16(0x0002);
  u16(5);
  u32(3);
  u32(56);
  u32(0);
  for (const [n, d] of [
    [23, 1],
    [48, 1],
    [37, 1],
  ] as const) {
    u32(n);
    u32(d);
  }
  for (const ch of GPS_MARKER) tiff.push(ch.charCodeAt(0));
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]; // "Exif\0\0" + TIFF
  const length = payload.length + 2;
  return Uint8Array.from([0xff, 0xe1, (length >> 8) & 0xff, length & 0xff, ...payload]);
}

/** The tiny JPEG with a GPS EXIF block after SOI and junk appended after EOI. */
export function jpegWithGps(): Uint8Array {
  const exif = gpsExifSegment();
  const tail = new TextEncoder().encode(`trailing ${GPS_MARKER}`);
  const out = new Uint8Array(TINY_JPEG.length + exif.length + tail.length);
  out.set(TINY_JPEG.subarray(0, 2), 0);
  out.set(exif, 2);
  out.set(TINY_JPEG.subarray(2), 2 + exif.length);
  out.set(tail, 2 + exif.length + TINY_JPEG.length - 2);
  return out;
}

/** The tiny JPEG claiming another pixel size in its frame header. */
export function jpegSized(width: number, height: number): Uint8Array {
  const out = TINY_JPEG.slice();
  for (let i = 2; i < out.length - 9;) {
    const marker = out[i + 1]!;
    const length = (out[i + 2]! << 8) | out[i + 3]!;
    if (marker >= 0xc0 && marker <= 0xc2) {
      out[i + 5] = (height >> 8) & 0xff;
      out[i + 6] = height & 0xff;
      out[i + 7] = (width >> 8) & 0xff;
      out[i + 8] = width & 0xff;
      return out;
    }
    i += 2 + length;
  }
  throw new Error("no SOF in fixture");
}

function chunk(fourcc: string, data: number[]): number[] {
  const size = data.length;
  const bytes = [...fourcc].map((c) => c.charCodeAt(0));
  bytes.push(size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >>> 24) & 0xff, ...data);
  if (size % 2) bytes.push(0);
  return bytes;
}

/** A 1×1 lossless WebP with an extended header (100×80 canvas) plus EXIF and XMP chunks. */
export function webpWithMetadata(): Uint8Array {
  const vp8x = [0x08 | 0x04, 0, 0, 0, 99, 0, 0, 79, 0, 0]; // flags: EXIF and XMP
  const vp8l = [0x2f, 0, 0, 0, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07];
  const exif = [...new TextEncoder().encode(`MM\0*${GPS_MARKER}`)];
  const xmp = [...new TextEncoder().encode(`<x:xmpmeta>${GPS_MARKER}</x:xmpmeta>`)];
  const body = [
    ...chunk("VP8X", vp8x),
    ...chunk("VP8L", vp8l),
    ...chunk("EXIF", exif),
    ...chunk("XMP ", xmp),
  ];
  const size = body.length + 4;
  return Uint8Array.from([
    ...[..."RIFF"].map((c) => c.charCodeAt(0)),
    size & 0xff,
    (size >> 8) & 0xff,
    (size >> 16) & 0xff,
    (size >>> 24) & 0xff,
    ...[..."WEBP"].map((c) => c.charCodeAt(0)),
    ...body,
  ]);
}

export function contains(haystack: Uint8Array, needle: string): boolean {
  return Buffer.from(haystack).includes(Buffer.from(needle));
}
