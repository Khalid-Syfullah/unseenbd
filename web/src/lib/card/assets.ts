/**
 * Browser-side loading for the card: fonts (so Bengali is shaped with Hind Siliguri, not a
 * fallback) and images (logo, badges, stamps, place covers, the visitor's photo).
 */
import type { CardFonts } from "./types";

const UI_FALLBACK = `"Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif`;
const DISPLAY_FALLBACK = `"DM Serif Display", Georgia, serif`;

/** The font stacks next/font put on <html> (`--font-hind-siliguri`, `--font-dm-serif-display`). */
export function resolveCardFonts(): CardFonts {
  if (typeof document === "undefined") return { ui: UI_FALLBACK, display: DISPLAY_FALLBACK };
  const style = getComputedStyle(document.documentElement);
  const ui = style.getPropertyValue("--font-hind-siliguri").trim();
  const display = style.getPropertyValue("--font-dm-serif-display").trim();
  return {
    ui: ui ? `${ui}, ${UI_FALLBACK}` : UI_FALLBACK,
    display: display ? `${display}, ${DISPLAY_FALLBACK}` : DISPLAY_FALLBACK,
  };
}

let fontsReady: Promise<CardFonts> | null = null;

/**
 * Loads every weight the card uses before anything is drawn: canvas text does not wait for web
 * fonts, and a Bengali line drawn with a fallback font would come out with broken conjuncts.
 */
export function ensureCardFonts(): Promise<CardFonts> {
  if (fontsReady) return fontsReady;
  const fonts = resolveCardFonts();
  if (typeof document === "undefined" || !("fonts" in document)) {
    return Promise.resolve(fonts);
  }
  const sample = "বাংলাদেশ জেলা ক্ষ্ম্র Unseen BD 0123";
  const loads = [
    `400 32px ${fonts.ui}`,
    `600 32px ${fonts.ui}`,
    `700 32px ${fonts.ui}`,
    `400 32px ${fonts.display}`,
  ].map((spec) => document.fonts.load(spec, sample).catch(() => []));
  fontsReady = Promise.all(loads)
    .then(() => document.fonts.ready)
    .then(() => fonts)
    .catch(() => fonts);
  return fontsReady;
}

const images = new Map<string, Promise<HTMLImageElement | null>>();

/** Loads an image once; resolves to null when it fails (the card draws without it). */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  let p = images.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (typeof img.decode === "function")
          img.decode().then(
            () => resolve(img),
            () => resolve(img),
          );
        else resolve(img);
      };
      img.onerror = () => {
        images.delete(src);
        resolve(null);
      };
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

/** Loads many images into a map by key, skipping the ones that fail. */
export async function loadImageMap(
  entries: Iterable<[string, string]>,
): Promise<Map<string, HTMLImageElement>> {
  const list = [...entries];
  const loaded = await Promise.all(list.map(([, src]) => loadImage(src)));
  const out = new Map<string, HTMLImageElement>();
  list.forEach(([key], i) => {
    const img = loaded[i];
    if (img) out.set(key, img);
  });
  return out;
}

/** Opens a file the visitor picked as an image. Nothing is uploaded: it stays in this tab. */
export function imageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not an image"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not decode"));
    };
    img.src = url;
  });
}

/** Natural size of an image-like source (0 × 0 when unknown). */
export function sourceSize(src: CanvasImageSource): { w: number; h: number } {
  if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) {
    return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height };
  }
  if (typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement) {
    return { w: src.videoWidth, h: src.videoHeight };
  }
  if (typeof VideoFrame !== "undefined" && src instanceof VideoFrame) {
    return { w: src.displayWidth, h: src.displayHeight };
  }
  const s = src as { width?: number | SVGAnimatedLength; height?: number | SVGAnimatedLength };
  const num = (v: number | SVGAnimatedLength | undefined) =>
    typeof v === "number" ? v : (v?.baseVal?.value ?? 0);
  return { w: num(s.width), h: num(s.height) };
}
