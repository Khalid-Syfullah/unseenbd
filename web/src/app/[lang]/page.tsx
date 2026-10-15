import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LanguageLinks } from "@/components/LanguageLinks";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { contentLocale, isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { alternatesFor } from "@/lib/seo";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { alternates: alternatesFor(lang, "/") };
}

/** Temporary home page (phase 01): wordmark, a sentence, theme switch and language links. */
export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getT(lang);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-10 px-4 py-16 md:px-6 lg:px-8">
      <Logo lang={contentLocale(lang)} alt={t("logo.alt")} priority className="w-full max-w-md" />

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl leading-snug font-bold text-balance md:text-3xl">
          {t("home.lead")}
        </h1>
        <p className="text-lg text-muted">{t("home.comingSoon")}</p>
      </div>

      <section className="flex flex-col gap-6 rounded-lg border border-border bg-raised p-6 shadow-1">
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted">{t("theme.label")}</h2>
          <ThemeToggle
            label={t("theme.label")}
            labels={{ light: t("theme.light"), dark: t("theme.dark"), system: t("theme.system") }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted">{t("language.label")}</h2>
          <LanguageLinks current={lang} label={t("language.label")} />
        </div>
      </section>
    </main>
  );
}
