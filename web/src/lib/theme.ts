/**
 * Theme preference
 *
 * The preference is stored in the `theme` cookie as `light`, `dark` or `system` (no cookie =
 * `system`). An inline script in `<head>` (THEME_SCRIPT) runs before first paint and sets:
 *
 * - `data-theme`      on `<html>`: the resolved theme, `light` or `dark` (what CSS keys on)
 * - `data-theme-pref` on `<html>`: the stored preference, `light`, `dark` or `system`
 *
 * With `system`, the script follows `prefers-color-scheme` live. Without JavaScript the CSS
 * falls back to `prefers-color-scheme` on its own (see globals.css).
 */
export const THEME_COOKIE = "theme";
export const THEME_PREFS = ["light", "dark", "system"] as const;
export type ThemePref = (typeof THEME_PREFS)[number];
export type Theme = "light" | "dark";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function isThemePref(value: unknown): value is ThemePref {
  return typeof value === "string" && (THEME_PREFS as readonly string[]).includes(value);
}

/**
 * Runs in `<head>` before paint. Kept as plain ES5 in a string so it can be inlined without a
 * bundle. Exposes `window.__setThemePref(pref)` for the theme switch.
 */
export const THEME_SCRIPT = `(function(){try{
var d=document.documentElement,mq=window.matchMedia("(prefers-color-scheme: dark)");
function read(){var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(light|dark|system)(?:;|$)/);return m?m[1]:"system";}
function apply(p){d.setAttribute("data-theme-pref",p);d.setAttribute("data-theme",p==="system"?(mq.matches?"dark":"light"):p);}
apply(read());
var onChange=function(){if(d.getAttribute("data-theme-pref")==="system")apply("system");};
if(mq.addEventListener)mq.addEventListener("change",onChange);else if(mq.addListener)mq.addListener(onChange);
window.__setThemePref=function(p){document.cookie="${THEME_COOKIE}="+p+"; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax";apply(p);};
}catch(e){}})();`;

declare global {
  interface Window {
    __setThemePref?: (pref: ThemePref) => void;
  }
}

/** Reads the current preference from `<html data-theme-pref>` (client only). */
export function getThemePref(): ThemePref | null {
  if (typeof document === "undefined") return null;
  const pref = document.documentElement.getAttribute("data-theme-pref");
  return isThemePref(pref) ? pref : null;
}

/** Saves the preference in the cookie and applies it immediately (client only). */
export function setThemePref(pref: ThemePref): void {
  if (window.__setThemePref) {
    window.__setThemePref(pref);
    return;
  }
  // Fallback if the inline script did not run.
  document.cookie = `${THEME_COOKIE}=${pref}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme-pref", pref);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}
