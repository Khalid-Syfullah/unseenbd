/**
 * Security headers for every response (wired up in `next.config.ts`, which bakes them into the
 * routes manifest at build time).
 *
 * The Content-Security-Policy allows only this origin. The one exception is Google Identity
 * Services on the sign-in and register pages, which loads a script, a stylesheet and an iframe
 * from accounts.google.com.
 *
 * `script-src` keeps `'unsafe-inline'`: the App Router streams its page data as inline
 * `<script>` tags, and almost every public page is prerendered (static or ISR), so there is no
 * per-request nonce to give them. What limits an injected script instead: nothing visitors write
 * is ever rendered as HTML (plain text, escaped by React), `connect-src`, `form-action` and
 * `img-src` keep data on this origin, `object-src 'none'` and `base-uri 'self'` close the other
 * classic holes, and `frame-ancestors 'none'` stops clickjacking.
 */

export type Header = { key: string; value: string };

/** Google Identity Services ("Sign in with Google"). */
export const GOOGLE_IDENTITY = "https://accounts.google.com/gsi/";

type Directives = Record<string, string[]>;

function baseDirectives(dev: boolean): Directives {
  return {
    "default-src": ["'self'"],
    // 'unsafe-eval' only for React Refresh in `next dev`.
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    // The dev server's hot reload talks over a websocket.
    "connect-src": ["'self'", ...(dev ? ["ws:"] : [])],
    // Card-maker video previews are blob: URLs.
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
}

function serialize(directives: Directives): string {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** The policy for every page and API response. */
export function contentSecurityPolicy({ dev = false, googleIdentity = false } = {}): string {
  const d = baseDirectives(dev);
  if (googleIdentity) {
    d["script-src"]!.push(`${GOOGLE_IDENTITY}client`);
    d["style-src"]!.push(`${GOOGLE_IDENTITY}style`);
    d["connect-src"]!.push(GOOGLE_IDENTITY);
    d["frame-src"] = [GOOGLE_IDENTITY];
  }
  return serialize(d);
}

/** Browser features the site uses: only geolocation (Near me, Share my location), on itself. */
export const PERMISSIONS_POLICY = [
  "geolocation=(self)",
  "camera=()",
  "microphone=()",
  "payment=()",
  "usb=()",
  "serial=()",
  "bluetooth=()",
  "midi=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
  "display-capture=()",
  "browsing-topics=()",
].join(", ");

/** Two years, sub-domains included (HTTPS is terminated by nginx; browsers ignore it on http). */
export const HSTS = "max-age=63072000; includeSubDomains";

export function securityHeaders({ dev = false, googleIdentity = false } = {}): Header[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev, googleIdentity }) },
    { key: "Strict-Transport-Security", value: HSTS },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
    // The Google sign-in popup has to be able to message the page that opened it.
    {
      key: "Cross-Origin-Opener-Policy",
      value: googleIdentity ? "same-origin-allow-popups" : "same-origin",
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
}

/** Path patterns (next.config `source` syntax) of the pages that show "Sign in with Google". */
export const GOOGLE_IDENTITY_PAGES = [
  "/login",
  "/register",
  "/:lang(en|zh|fr|de|it|ja)/login",
  "/:lang(en|zh|fr|de|it|ja)/register",
];

/**
 * The `headers()` entries: the default set for everything, then the sign-in pages' set (a later
 * entry overrides an earlier one for the same header key).
 */
export function securityHeaderRules(dev = false): { source: string; headers: Header[] }[] {
  return [
    { source: "/:path*", headers: securityHeaders({ dev }) },
    ...GOOGLE_IDENTITY_PAGES.map((source) => ({
      source,
      headers: securityHeaders({ dev, googleIdentity: true }),
    })),
  ];
}
