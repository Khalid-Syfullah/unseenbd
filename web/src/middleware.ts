import { NextResponse, type NextRequest } from "next/server";
import { resolveLocaleRoute } from "@/i18n/routing";

export function middleware(request: NextRequest) {
  const route = resolveLocaleRoute(request.nextUrl.pathname);
  if (route.action === "next") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = route.pathname;
  return route.action === "redirect" ? NextResponse.redirect(url, 308) : NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals and any path with a file extension (favicons,
  // manifest, /brand/*.svg, /places/*.webp, …).
  matcher: ["/((?!api/|_next/|.*\\.[^/]+$).*)"],
};
