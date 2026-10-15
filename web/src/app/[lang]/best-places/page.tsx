import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { CardGrid } from "@/components/ui/Card";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatNumber } from "@/lib/format";
import { firstParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { listDivisions, listPopular } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("lists.bestTitle"),
    description: t("lists.bestMeta"),
    alternates: alternatesFor(lang, "/best-places"),
  };
}

export default async function BestPlacesPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const [divisions, all] = await Promise.all([listDivisions(lang), listPopular(lang)]);
  const wanted = firstParam((await searchParams).division);
  const division = divisions.find((d) => d.slug === wanted);
  const places = division ? all.filter((p) => p.division.slug === division.slug) : all;
  const base = localePath(locale, "/best-places");
  const counts = new Map<string, number>();
  for (const p of all) counts.set(p.division.slug, (counts.get(p.division.slug) ?? 0) + 1);

  return (
    <PageContainer>
      <PageHeader title={t("lists.bestTitle")} intro={t("lists.bestIntro")} />
      <ChipRow label={t("lists.divisionsLabel")}>
        <FilterChip
          href={base}
          selected={!division}
          count={formatNumber(all.length, lang)}
          scroll={false}
        >
          {t("common.all")}
        </FilterChip>
        {divisions.map((d) => (
          <FilterChip
            key={d.slug}
            href={`${base}?division=${d.slug}`}
            selected={division?.slug === d.slug}
            count={formatNumber(counts.get(d.slug) ?? 0, lang)}
            scroll={false}
          >
            {d.name}
          </FilterChip>
        ))}
      </ChipRow>
      {places.length ? (
        <CardGrid max={4}>
          {places.map((place, i) => (
            <PlaceCard key={place.slug} place={place} priority={i < 4} headingLevel={2} />
          ))}
        </CardGrid>
      ) : (
        <EmptyState body={t("home.popular.empty")} />
      )}
    </PageContainer>
  );
}
