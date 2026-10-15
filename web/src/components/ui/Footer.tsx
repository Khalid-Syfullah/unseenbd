import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { FOOTER_LEGAL, FOOTER_SECTIONS } from "@/lib/nav";
import { FACEBOOK_URL } from "@/lib/site";
import { Icon } from "./Icon";
import { LanguageList } from "./LocaleSwitch";

const LINK =
  "inline-flex min-h-11 items-center text-sm text-muted transition-colors duration-[var(--dur-1)] ease-standard hover:text-text md:min-h-9";

/**
 * Site footer (FEATURES.md §1.6): Explore · Nearby · Trip planning · Foreign travel · Divisions
 * (8 links to `/best-places?division=`) · Top players, then About / Safety / Privacy, Facebook,
 * the language switch and the credit line.
 */
export function Footer({
  lang,
  divisions,
}: {
  lang: Locale;
  /** The 8 divisions in display order, names in the page language. */
  divisions: { slug: string; name: string }[];
}) {
  const t = getT(lang);
  const [explore, nearby, planning, foreign, players] = FOOTER_SECTIONS;
  const columns = [
    explore!,
    nearby!,
    planning!,
    foreign!,
    {
      title: "footer.divisions" as const,
      links: divisions.map((d) => ({
        href: localePath(lang, `/best-places?division=${d.slug}`),
        label: d.name,
      })),
    },
    players!,
  ].map((col) =>
    "links" in col
      ? col
      : {
          title: col.title,
          links: col.items.map((item) => ({
            href: localePath(lang, item.path),
            label: t(item.label),
          })),
        },
  );

  return (
    <footer className="mt-16 border-t border-border bg-sunken">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-10 md:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
          {columns.map((col) => (
            <section key={col.title}>
              <h2 className="mb-1 text-sm font-semibold text-text">{t(col.title)}</h2>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5">
            {FOOTER_LEGAL.map((item) => (
              <Link key={item.path} href={localePath(lang, item.path)} className={LINK}>
                {t(item.label)}
              </Link>
            ))}
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK} gap-1.5`}
            >
              <Icon name="facebook" size={18} />
              Facebook
            </a>
          </div>
          <LanguageList className="-mx-2.5" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Image
            src="/brand/logo-mark.svg"
            alt=""
            width={32}
            height={32}
            unoptimized
            className="size-8"
          />
          <p className="text-sm text-muted">
            {t("footer.credit")} <span className="text-muted">{t("footer.boundaries")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
