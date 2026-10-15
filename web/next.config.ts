import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const webRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // web/ is the app root (stops Next from picking up lockfiles in parent folders).
  outputFileTracingRoot: webRoot,
  // Lint and typecheck run as their own steps in `npm run check`.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // src/app/global-not-found.tsx: a full-document 404 for unmatched URLs, needed because the
    // root layout lives under [lang].
    globalNotFound: true,
  },
};

export default nextConfig;
