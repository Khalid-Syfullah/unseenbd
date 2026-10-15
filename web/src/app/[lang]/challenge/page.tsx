import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { ChallengeCompare } from "@/components/my-map/ChallengeCompare";
import { myMapDivisions } from "@/components/my-map/data";
import { ProgressCard } from "@/components/my-map/ProgressCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { SearchParams } from "@/lib/params";
import { parseDistrictShare } from "@/lib/visited/encode";
import { getMyBangladeshLevels } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  const shared = parseDistrictShare(await searchParams, "c");
  const title = shared?.name
    ? t("challenge.heading", { name: shared.name })
    : t("challenge.headingAnon");
  return {
    title,
    description: t("challenge.metaDescription"),
    robots: { index: false, follow: true },
    alternates: { canonical: localePath(lang, "/challenge") },
    openGraph: { title, description: t("challenge.metaDescription") },
  };
}

/** `/challenge?c=…&n=…`: a friend's districts and count, compared with yours, and a CTA. */
export default async function ChallengePage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const [divisions, levels, query] = await Promise.all([
    myMapDivisions(locale),
    getMyBangladeshLevels(contentLocale(locale)),
    searchParams,
  ]);
  const shared = parseDistrictShare(query, "c");
  const ids = shared?.ids ?? [];
  const name = shared?.name ?? "";
  const title = name ? t("challenge.heading", { name }) : t("challenge.headingAnon");

  if (!ids.length) {
    return (
      <PageContainer>
        <PageHeader title={t("challenge.title")} />
        <EmptyState
          body={t("challenge.empty")}
          action={
            <ButtonLink href={localePath(locale, "/my-bangladesh")} icon="my-map">
              {t("challenge.ctaStart")}
            </ButtonLink>
          }
        />
      </PageContainer>
    );
  }

  const visited = new Set(ids);
  const slugs = divisions.flatMap((d) =>
    d.districts.filter((x) => visited.has(x.id)).map((x) => x.slug),
  );
  const line = name
    ? t("challenge.line", { name, count: ids.length })
    : t("challenge.lineAnon", { count: ids.length });

  return (
    <PageContainer className="gap-8">
      <PageHeader title={title} intro={line} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,640px)_1fr]">
        <div className="flex flex-col gap-2">
          <h2 className="text-h2">{t("challenge.theirDistricts")}</h2>
          <BangladeshMap
            visited={slugs}
            legend
            label={t("myBd.sharedMap", { name: name || t("challenge.friend") })}
          />
          <p className="text-xs text-muted">{t("map.credit")}</p>
        </div>
        <div className="flex flex-col gap-4">
          <ProgressCard count={ids.length} levels={levels} label={name || t("challenge.friend")} />
          <ChallengeCompare theirs={ids} />
        </div>
      </div>
    </PageContainer>
  );
}
