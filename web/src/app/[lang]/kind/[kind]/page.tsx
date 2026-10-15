import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { QueryPagination } from "@/components/discovery/QueryPagination";
import { CardGrid } from "@/components/ui/Card";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatNumber } from "@/lib/format";
import { pageParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { getKind, listKinds, listPlaces } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string; kind: string }>;
  searchParams: Promise<SearchParams>;
};

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang, kind: key } = await params;
  if (!isLocale(lang)) return {};
  const kind = await getKind(key, contentLocale(lang));
  if (!kind) return {};
  const t = getT(lang);
  return {
    title: t("lists.kindTitle", { name: kind.label, count: kind.count }),
    description: t("lists.kindMeta", { name: kind.label, count: kind.count }),
    alternates: alternatesFor(lang, `/kind/${kind.key}`),
  };
}

export default async function KindPage({ params, searchParams }: PageProps) {
  const { lang: param, kind: key } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const kinds = await listKinds(lang);
  const kind = kinds.find((k) => k.key === key);
  if (!kind) notFound();

  const result = await listPlaces({
    kind: kind.key,
    page: pageParam((await searchParams).page),
    pageSize: PAGE_SIZE,
    lang,
  });
  const base = localePath(locale, `/kind/${kind.key}`);

  return (
    <PageContainer>
      <PageHeader
        title={t("lists.kindTitle", { name: kind.label, count: kind.count })}
        intro={t("lists.kindIntro")}
      />
      <ChipRow label={t("lists.kindsLabel")}>
        {kinds.map((k) => (
          <FilterChip
            key={k.key}
            href={localePath(locale, `/kind/${k.key}`)}
            selected={k.key === kind.key}
            count={formatNumber(k.count, lang)}
          >
            {k.label}
          </FilterChip>
        ))}
      </ChipRow>
      {result.items.length ? (
        <CardGrid max={4}>
          {result.items.map((place, i) => (
            <PlaceCard key={place.slug} place={place} priority={i < 4} headingLevel={2} />
          ))}
        </CardGrid>
      ) : (
        <EmptyState body={t("lists.empty")} />
      )}
      <QueryPagination base={base} page={result.page} pageCount={result.pageCount} />
    </PageContainer>
  );
}
