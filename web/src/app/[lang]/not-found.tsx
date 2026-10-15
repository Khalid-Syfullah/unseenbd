"use client";

import Link from "next/link";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";

/** Temporary 404 (phase 01). A fuller page with district links comes in a later phase. */
export default function NotFound() {
  const lang = useLocale();
  const t = useT();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-4 px-4 py-16 md:px-6">
      <p className="font-display text-6xl text-sun">404</p>
      <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="text-muted">{t("notFound.body")}</p>
      <p>
        <Link
          href={localePath(lang, "/")}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover"
        >
          {t("notFound.backHome")}
        </Link>
      </p>
    </main>
  );
}
