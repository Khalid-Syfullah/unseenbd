/** Public origin of the site, used for canonical URLs and metadata. Set SITE_URL in production. */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "Unseen BD";

/**
 * Colours for <meta name="theme-color"> (browser chrome). Meta tags cannot read CSS
 * variables, so these mirror --bg in DESIGN.md §2.5 for each theme.
 */
export const THEME_COLOR = {
  light: "#FBF6EC",
  dark: "#0A1024",
} as const;
