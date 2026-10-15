import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT, type MessageKey } from "@/i18n/messages";
import { gamePagePath, parseGameChallenge } from "@/lib/games/challenge";
import { dhakaDate } from "@/lib/games/seed";
import type { QuizGame } from "@/lib/games/types";
import type { SearchParams } from "@/lib/params";
import { alternatesFor, ogImages } from "@/lib/seo";
import { getGameData } from "@/server/data";
import { topEntries } from "@/server/leaderboard";
import { MoreToTry } from "./MoreToTry";
import { QuizArena } from "./QuizArena";

export type QuizPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

const COPY: Record<QuizGame, { title: MessageKey; description: MessageKey; intro: MessageKey }> = {
  district_quiz: {
    title: "quiz.bangladesh.title",
    description: "quiz.bangladesh.metaDescription",
    intro: "quiz.bangladesh.intro",
  },
  famous_quiz: {
    title: "quiz.famous.title",
    description: "quiz.famous.metaDescription",
    intro: "quiz.famous.intro",
  },
};

/** Metadata for a scored quiz page. */
export async function quizMetadata(
  game: QuizGame,
  params: QuizPageProps["params"],
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  const path = gamePagePath(game);
  return {
    title: t(COPY[game].title),
    description: t(COPY[game].description),
    alternates: alternatesFor(lang, path),
    openGraph: {
      images: ogImages(lang),
      title: t(COPY[game].title),
      description: t(COPY[game].description),
      url: localePath(lang, path),
    },
  };
}

/** `/quiz/bangladesh` and `/quiz/famous`: 20 daily questions with a checked leaderboard. */
export async function QuizPage({ game, params, searchParams }: { game: QuizGame } & QuizPageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const t = getT(locale);
  const [{ data, labels }, query] = await Promise.all([
    getGameData(contentLocale(locale)),
    searchParams,
  ]);
  const today = dhakaDate();
  const challenge = parseGameChallenge(query, today, game);

  return (
    <PageContainer className="gap-8">
      <PageHeader
        title={t(COPY[game].title)}
        intro={
          <>
            {t(COPY[game].intro)}{" "}
            <span className="text-base text-subtle">{t("quiz.dailyNote")}</span>
          </>
        }
      />
      <QuizArena
        game={game}
        data={data}
        labels={labels}
        today={today}
        challenge={challenge}
        entries={topEntries(game)}
      />
      <MoreToTry locale={locale} exclude={game === "district_quiz" ? "districts" : "famous"} />
    </PageContainer>
  );
}
