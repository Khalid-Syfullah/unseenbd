import Link from "next/link";
import { HTML_LANG, LOCALE_NAMES, LOCALES, localePath, type Locale } from "@/i18n/locales";

type Props = {
  current: Locale;
  label: string;
  /** Path without a locale prefix, e.g. "/" or "/explore". */
  path?: string;
};

/** Links to the same page in every locale; the current one is marked. */
export function LanguageLinks({ current, label, path = "/" }: Props) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={localePath(locale, path)}
                hrefLang={HTML_LANG[locale]}
                lang={HTML_LANG[locale]}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-pill border px-4 text-sm font-semibold transition-colors duration-[var(--dur-1)] ease-standard ${
                  active
                    ? "border-primary bg-primary-wash text-on-primary-wash"
                    : "border-border bg-raised text-text hover:border-border-strong"
                }`}
              >
                {LOCALE_NAMES[locale]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
