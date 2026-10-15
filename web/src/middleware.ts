import { NextResponse, type NextRequest } from "next/server";
import { resolveLocaleRoute } from "@/i18n/routing";
import { clientIp, createRateLimiter } from "@/server/rate-limit";

/** Every page and API request: at most this many per minute per client IP (MASTER_PROMPT §6). */
export const GLOBAL_LIMIT_PER_MINUTE = 3000;

const limiter = createRateLimiter({
  limit: GLOBAL_LIMIT_PER_MINUTE,
  windowMs: 60_000,
  maxKeys: 50_000,
});

/** Paths that are never rate limited (uptime checks). */
const UNLIMITED = new Set(["/api/health"]);

function tooMany(request: NextRequest, retryAfter: number): NextResponse {
  const headers = { "Retry-After": String(retryAfter), "Cache-Control": "no-store" };
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "rate_limited", retryAfter }, { status: 429, headers });
  }
  return new NextResponse("Too many requests. Please wait a minute and try again.", {
    status: 429,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!UNLIMITED.has(pathname)) {
    const hit = limiter.hit(clientIp(request.headers));
    if (!hit.ok) return tooMany(request, hit.retryAfter);
  }
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const route = resolveLocaleRoute(pathname);
  if (route.action === "next") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = route.pathname;
  return route.action === "redirect" ? NextResponse.redirect(url, 308) : NextResponse.rewrite(url);
}

export const config = {
  // Pages and API routes. Skips Next internals and any path with a file extension (favicons,
  // manifest, /brand/*.svg, /places/*.webp, …), which nginx caches.
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)"],
};
