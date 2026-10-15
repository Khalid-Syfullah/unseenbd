import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "@/fonts";
import { localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { THEME_SCRIPT } from "@/lib/theme";
import { listDistricts } from "@/server/data";
import "./globals.css";

/*
 * 404 for every URL that matches no route (unknown paths in any locale). It is a whole
 * document because the root layout lives under [lang]. The locale is not known here, so the
 * page speaks Bengali and English. notFound() inside a page uses [lang]/not-found.tsx instead.
 */

const bn = getT("bn");
const en = getT("en");

export const metadata: Metadata = {
  title: `${bn("notFound.title")} · ${en("notFound.title")}`,
  robots: { index: false },
};

const linkClass =
  "inline-flex min-h-11 items-center rounded-md px-5 font-semibold transition-colors duration-[var(--dur-1)] ease-standard";

export default async function GlobalNotFound() {
  const [bnDistricts, enDistricts] = await Promise.all([listDistricts("bn"), listDistricts("en")]);
  return (
    <html lang="bn" dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-bg text-text antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-6 px-4 py-16 md:px-6">
          <p className="font-display text-6xl text-sun">404</p>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{bn("notFound.title")}</h1>
            <p className="text-muted">{bn("notFound.body")}</p>
          </div>
          <div lang="en" className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">{en("notFound.title")}</h2>
            <p className="text-muted">{en("notFound.body")}</p>
          </div>
          <p className="flex flex-wrap gap-3">
            <Link
              href={localePath("bn", "/")}
              className={`${linkClass} bg-primary text-on-primary hover:bg-primary-hover`}
            >
              {bn("notFound.backHome")}
            </Link>
            <Link
              href={localePath("en", "/")}
              lang="en"
              className={`${linkClass} border border-border-strong bg-raised text-text hover:bg-primary-wash`}
            >
              {en("notFound.backHome")}
            </Link>
          </p>
          <p className="flex flex-wrap gap-3">
            <Link
              href={localePath("bn", "/explore")}
              className={`${linkClass} border border-border-strong bg-raised text-text hover:bg-primary-wash`}
            >
              {bn("notFound.explore")}
            </Link>
            <Link
              href={localePath("bn", "/my-bangladesh")}
              className={`${linkClass} border border-border-strong bg-raised text-text hover:bg-primary-wash`}
            >
              {bn("notFound.myBangladesh")}
            </Link>
          </p>
          <nav aria-label={bn("notFound.allDistricts")} className="flex flex-col gap-2">
            <h2 className="text-h3">{bn("notFound.allDistricts")}</h2>
            <ul className="flex flex-wrap gap-x-1">
              {bnDistricts.map((d, i) => (
                <li key={d.slug}>
                  <Link
                    href={localePath("bn", `/district/${d.slug}`)}
                    className="inline-flex min-h-11 items-center px-2.5 text-primary underline-offset-2 hover:underline"
                  >
                    {d.name}
                    <span lang="en" className="sr-only">
                      {" "}
                      {enDistricts[i]?.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </main>
      </body>
    </html>
  );
}
