import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/discovery/PageHeader";
import { GameHub } from "@/components/games/GameHub";
import { MoreToTry } from "@/components/games/MoreToTry";
import { StatusTag } from "@/components/ui/Chip";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { hubGameFromQuery, parseGameChallenge } from "@/lib/games/challenge";
import { dhakaDate } from "@/lib/games/seed";
import { HUB_GAMES, isHubGame, type HubGame } from "@/lib/games/types";
import type { SearchParams } from "@/lib/params";
import { alternatesFor, ogImages } from "@/lib/seo";
import { getGameData } from "@/server/data";
import { topEntries } from "@/server/leaderboard";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("games.title"),
    description: t("games.metaDescription"),
    alternates: alternatesFor(lang, "/play"),
    openGraph: {
      images: ogImages(lang),
      title: t("games.title"),
      description: t("games.metaDescription"),
      url: localePath(lang, "/play"),
    },
  };
}

/** `/play`: the game hub — four daily games, personal records and verified leaderboards. */
export default async function PlayPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const [{ data, labels }, query] = await Promise.all([
    getGameData(contentLocale(locale)),
    searchParams,
  ]);
  const today = dhakaDate();
  const parsed = parseGameChallenge(query, today);
  const challenge = parsed && isHubGame(parsed.game) ? parsed : null;
  const initialGame = challenge ? (challenge.game as HubGame) : hubGameFromQuery(query);
  const boards = Object.fromEntries(HUB_GAMES.map((g) => [g, topEntries(g)])) as Record<
    HubGame,
    ReturnType<typeof topEntries>
  >;

  return (
    <PageContainer className="gap-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <StatusTag tone="good" icon="calendar">
          {t("games.kicker")}
        </StatusTag>
        <h1 className="text-h1 text-balance">{t("games.title")}</h1>
        <p className="max-w-[60ch] text-lg text-muted">{t("games.intro")}</p>
        <Image
          src="/illustrations/game-hub.svg"
          alt=""
          width={1200}
          height={500}
          priority
          unoptimized
          className="mt-2 h-auto w-full max-w-[720px] rounded-xl"
        />
      </header>
      <GameHub
        data={data}
        labels={labels}
        today={today}
        initialGame={initialGame}
        challenge={challenge}
        boards={boards}
      />
      <MoreToTry locale={locale} exclude="play" />
    </PageContainer>
  );
}
