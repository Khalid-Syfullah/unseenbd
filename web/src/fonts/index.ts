import localFont from "next/font/local";

/*
 * Self-hosted fonts (SIL Open Font License, see OFL-*.txt in this folder).
 * next/font exposes each family as a CSS variable on <html>; globals.css points
 * --font-display and --font-ui at them.
 */

/** DM Serif Display: wordmark, hero titles and big numbers (Latin only). */
export const displayFont = localFont({
  src: [{ path: "./DMSerifDisplay-Regular.ttf", weight: "400", style: "normal" }],
  variable: "--font-dm-serif-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
  preload: false,
});

/** Hind Siliguri: all UI and body text, Bengali and Latin. */
export const uiFont = localFont({
  src: [
    { path: "./HindSiliguri-Regular.ttf", weight: "400", style: "normal" },
    { path: "./HindSiliguri-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./HindSiliguri-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-hind-siliguri",
  display: "swap",
  fallback: ["Noto Sans Bengali", "system-ui", "sans-serif"],
});

/** Class names that define both font variables; put them on <html>. */
export const fontVariables = `${displayFont.variable} ${uiFont.variable}`;
