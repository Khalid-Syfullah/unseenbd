"use client";

import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";

type DistrictLink = { slug: string; name: string };

/** Friendly 404 (FEATURES.md §1.10): illustration, message, three links and all 64 districts. */
export function NotFoundView({
  districts,
}: {
  districts: { bn: DistrictLink[]; en: DistrictLink[] };
}) {
  const t = useT();
  const locale = useLocale();
  const list = locale === "bn" ? districts.bn : districts.en;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 md:px-6 md:py-16">
      <Image
        src="/illustrations/not-found.svg"
        alt=""
        width={480}
        height={320}
        unoptimized
        className="h-auto w-full max-w-[360px]"
      />
      <div className="flex flex-col gap-2">
        <p className="font-display text-6xl text-sun">404</p>
        <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="text-muted">{t("notFound.body")}</p>
      </div>
      <p className="flex flex-wrap gap-3">
        <ButtonLink href={localePath(locale, "/explore")} icon="explore">
          {t("notFound.explore")}
        </ButtonLink>
        <ButtonLink href={localePath(locale, "/")} variant="secondary" icon="home">
          {t("notFound.backHome")}
        </ButtonLink>
        <ButtonLink href={localePath(locale, "/my-bangladesh")} variant="secondary" icon="my-map">
          {t("notFound.myBangladesh")}
        </ButtonLink>
      </p>
      <section aria-labelledby="nf-districts" className="flex flex-col gap-3">
        <h2 id="nf-districts" className="text-h3">
          {t("notFound.allDistricts")}
        </h2>
        <ul className="flex flex-wrap gap-x-1 gap-y-0">
          {list.map((d) => (
            <li key={d.slug}>
              <Link
                href={localePath(locale, `/district/${d.slug}`)}
                className="inline-flex min-h-11 items-center rounded-md px-2.5 text-primary underline-offset-2 hover:underline"
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
