/**
 * Timelines and projection maths for the video exports. Pure: the renderer asks for a frame at
 * time `t` (0–1 of the clip) and draws it.
 *
 * - **3D**: the map leans back in perspective while the visited districts fill in one by one,
 *   then settles flat with everything filled.
 * - **360°**: the filled map turns once around its vertical axis.
 */
import type { CardFrame } from "./types";

/** Both clips are six seconds long. */
export const VIDEO_SECONDS = 6;
export const VIDEO_FPS = 30;

/** How far the map leans back in the 3D clip. */
export const MAX_TILT = (52 * Math.PI) / 180;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Smooth start and end. */
export function easeInOut(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * The 3D clip: 0–1 s lean back, 0.6–4.6 s districts fill in order, 4.8–5.8 s back to flat,
 * last 0.2 s still (so the final frame is the finished card).
 */
export function tiltFrame(t: number): CardFrame {
  const s = clamp01(t) * VIDEO_SECONDS;
  let tilt: number;
  if (s < 1) tilt = MAX_TILT * easeInOut(s / 1);
  else if (s < 4.8) tilt = MAX_TILT;
  else if (s < 5.8) tilt = MAX_TILT * (1 - easeInOut((s - 4.8) / 1));
  else tilt = 0;
  const fill = clamp01((s - 0.6) / 4);
  return { fill, tilt, spin: 0 };
}

/** The 360° clip: one full turn, eased at both ends, everything filled. */
export function spinFrame(t: number): CardFrame {
  return { fill: 1, tilt: 0, spin: 2 * Math.PI * easeInOut(t) };
}

/** Focal length used for both projections, relative to the visual's longer side. */
export const FOCAL = 1.8;

/**
 * Perspective for a point at offset `offset` from the axis (in px) after turning by `angle`:
 * its new offset on screen and the scale at that depth. Positive offsets turn away from the
 * viewer (the top of the map in the 3D clip, the right side in the spin). `push` moves the
 * whole plane away, so the nearest point never comes closer than the flat card (scale ≤ 1).
 */
export function project(
  offset: number,
  angle: number,
  focal: number,
  push = 0,
): { pos: number; scale: number } {
  const depth = offset * Math.sin(angle) + push;
  const scale = focal / (focal + depth);
  return { pos: offset * Math.cos(angle) * scale, scale };
}

/** How many filled regions to draw for a fill level: whole ones plus the fraction of the next. */
export function fillCount(fill: number, total: number): { whole: number; partial: number } {
  const n = clamp01(fill) * Math.max(0, total);
  const whole = Math.floor(n);
  return { whole, partial: whole < total ? n - whole : 0 };
}
