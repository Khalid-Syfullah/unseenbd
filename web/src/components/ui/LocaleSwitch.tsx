"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useT } from "@/i18n/client";
import {
  HTML_LANG,
  isLocale,
  LOCALE_NAMES,
  LOCALES,
  localePath,
  type Locale,
} from "@/i18n/locales";
import { stripLocale } from "@/lib/nav";
import { cn } from "./cn";
import { Chevron, Icon } from "./Icon";

/** Short names for the compact header select on phones. */
const SHORT_NAMES: Record<Locale, string> = {
  bn: "বাং",
  en: "EN",
  zh: "中文",
  fr: "FR",
  de: "DE",
  it: "IT",
  ja: "日本",
};

/** The current page's path in another locale, keeping the query string and hash. */
function useSwitchHref() {
  const pathname = usePathname();
  const path = stripLocale(pathname);
  return (locale: Locale, withQuery = false) => {
    const base = localePath(locale, path);
    if (!withQuery || typeof window === "undefined") return base;
    return `${base}${window.location.search}${window.location.hash}`;
  };
}

/**
 * Header language select (DESIGN.md §4.1): a native select showing the current language
 * (short name on phones). Changing it opens the same page in that language (`/x` ↔ `/en/x`).
 */
export function LanguageSelect({ className }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const hrefFor = useSwitchHref();

  return (
    <label
      className={cn(
        "tap-target relative inline-flex h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-semibold text-text md:pr-2 md:pl-2.5",
        "transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2",
        "has-[select:focus-visible]:outline-3 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-focus",
        className,
      )}
    >
      <span className="sr-only">{t("language.label")}</span>
      <Icon name="language" size={18} className="hidden text-muted md:block" />
      <span aria-hidden lang={HTML_LANG[locale]} className="md:hidden">
        {SHORT_NAMES[locale]}
      </span>
      <span aria-hidden lang={HTML_LANG[locale]} className="hidden md:inline">
        {LOCALE_NAMES[locale]}
      </span>
      <Chevron size={16} className="hidden text-muted md:block" />
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value;
          if (isLocale(next) && next !== locale) router.push(hrefFor(next, true));
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={HTML_LANG[l]}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Footer language switch: links to this page in every locale. */
export function LanguageList({ className }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const hrefFor = useSwitchHref();
  return (
    <nav aria-label={t("language.label")} className={className}>
      <ul className="flex flex-wrap gap-x-1 gap-y-1">
        {LOCALES.map((l) => (
          <li key={l}>
            <Link
              href={hrefFor(l)}
              hrefLang={HTML_LANG[l]}
              lang={HTML_LANG[l]}
              aria-current={l === locale ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-sm px-2.5 text-sm",
                l === locale ? "font-semibold text-primary" : "text-muted hover:text-text",
              )}
            >
              {LOCALE_NAMES[l]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
