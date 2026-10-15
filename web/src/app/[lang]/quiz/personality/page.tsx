import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { MoreToTry } from "@/components/games/MoreToTry";
import { PersonalityQuiz } from "@/components/games/PersonalityQuiz";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { dhakaDate } from "@/lib/games/seed";
import { alternatesFor, ogImages } from "@/lib/seo";
import { getPersonalityData } from "@/server/data";

type PageProps = { params: Promise<{ lang: string }> };

/** The rounds change with the day (Bangladesh time); refresh the page hourly. */
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("quiz.personality.title"),
    description: t("quiz.personality.metaDescription"),
    alternates: alternatesFor(lang, "/quiz/personality"),
    openGraph: {
      images: ogImages(lang),
      title: t("quiz.personality.title"),
      description: t("quiz.personality.metaDescription"),
      url: localePath(lang, "/quiz/personality"),
    },
  };
}

/** `/quiz/personality`: six picks between four kinds of place → your travel style. */
export default async function PersonalityPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getT(lang);
  const { places, pools } = await getPersonalityData(contentLocale(lang));
  return (
    <PageContainer className="gap-8">
      <PageHeader title={t("quiz.personality.title")} intro={t("quiz.personality.intro")} />
      <PersonalityQuiz date={dhakaDate()} places={places} pools={pools} />
      <MoreToTry locale={lang} exclude="personality" />
    </PageContainer>
  );
}
