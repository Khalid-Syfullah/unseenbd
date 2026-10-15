"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FOUNDATION_COPY } from "@/i18n/foundation-copy";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/i18n/locales";

/** Temporary 404 (phase 01). A fuller page with district links comes in a later phase. */
export default function NotFound() {
  const params = useParams<{ lang?: string }>();
  const lang = isLocale(params?.lang) ? params.lang : DEFAULT_LOCALE;
  const copy = FOUNDATION_COPY[lang];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 px-4 py-16 md:px-6">
      <p className="font-display text-6xl text-sun">404</p>
      <h1 className="text-2xl font-bold">{copy.notFoundTitle}</h1>
      <p className="text-muted">{copy.notFoundBody}</p>
      <p>
        <Link
          href={localePath(lang, "/")}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover"
        >
          {copy.backHome}
        </Link>
      </p>
    </main>
  );
}
