import { DEFAULT_LOCALE, PREFIXED_LOCALES } from "./locales";

/** What the middleware should do with an incoming path. Pure, so it can be unit-tested. */
export type LocaleRoute =
  | { action: "next" }
  | { action: "rewrite"; pathname: string }
  | { action: "redirect"; pathname: string };

export function resolveLocaleRoute(pathname: string): LocaleRoute {
  const first = pathname.split("/")[1] ?? "";

  // `/bn/…` is never a public URL: Bengali lives at the root. Send it to the canonical path.
  if (first === DEFAULT_LOCALE) {
    const rest = pathname.slice(DEFAULT_LOCALE.length + 1);
    return { action: "redirect", pathname: rest === "" ? "/" : rest };
  }

  // `/en/…`, `/zh/…` etc. are served as they are.
  if ((PREFIXED_LOCALES as readonly string[]).includes(first)) {
    return { action: "next" };
  }

  // Everything else is Bengali: rewrite internally to `/bn/…`.
  return {
    action: "rewrite",
    pathname: pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`,
  };
}
