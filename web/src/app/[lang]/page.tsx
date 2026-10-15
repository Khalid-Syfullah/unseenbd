import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LanguageLinks } from "@/components/LanguageLinks";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FOUNDATION_COPY } from "@/i18n/foundation-copy";
import { contentLocale, isLocale } from "@/i18n/locales";
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
  const copy = FOUNDATION_COPY[lang];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-10 px-4 py-16 md:px-6 lg:px-8">
      <Logo lang={contentLocale(lang)} alt={copy.logoAlt} priority className="w-full max-w-md" />

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl leading-snug font-bold text-balance md:text-3xl">{copy.lead}</h1>
        <p className="text-lg text-muted">{copy.comingSoon}</p>
      </div>

      <section className="flex flex-col gap-6 rounded-lg border border-border bg-raised p-6 shadow-1">
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted">{copy.themeLabel}</h2>
          <ThemeToggle
            label={copy.themeLabel}
            labels={{ light: copy.themeLight, dark: copy.themeDark, system: copy.themeSystem }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted">{copy.languageLabel}</h2>
          <LanguageLinks current={lang} label={copy.languageLabel} />
        </div>
      </section>
    </main>
  );
}
