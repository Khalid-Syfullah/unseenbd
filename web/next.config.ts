import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const webRoot = dirname(fileURLToPath(import.meta.url));

/** Unhashed static files: a week in the browser, then revalidated in the background for a day. */
const STATIC_CACHE = "public, max-age=604800, stale-while-revalidate=86400";
const STATIC_DIRS = [
  "places",
  "brand",
  "icons",
  "illustrations",
  "maps",
  "stamps",
  "badges",
  "card-themes",
  "social",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // web/ is the app root (stops Next from picking up lockfiles in parent folders).
  outputFileTracingRoot: webRoot,
  // Lint and typecheck run as their own steps in `npm run check`.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      ...STATIC_DIRS.map((dir) => ({
        source: `/${dir}/:path*`,
        headers: [{ key: "Cache-Control", value: STATIC_CACHE }],
      })),
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        // The worker itself must never be served stale, or updates would not reach visitors.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  experimental: {
    // src/app/global-not-found.tsx: a full-document 404 for unmatched URLs, needed because the
    // root layout lives under [lang].
    globalNotFound: true,
  },
};

export default nextConfig;
