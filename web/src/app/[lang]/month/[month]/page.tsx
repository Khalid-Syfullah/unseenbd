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
import { parseMonth } from "@/lib/months";
import { pageParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { currentMonth } from "@/lib/season";
import { getMonth, listMonths, listPlaces } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string; month: string }>;
  searchParams: Promise<SearchParams>;
};

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang, month: slug } = await params;
  if (!isLocale(lang)) return {};
  const number = parseMonth(slug);
  const month = number ? await getMonth(number, contentLocale(lang)) : null;
  if (!month) return {};
  const t = getT(lang);
  return {
    title: t("lists.monthTitle", { month: month.name, count: month.count }),
    description: t("lists.monthMeta", { month: month.name, count: month.count }),
    alternates: alternatesFor(lang, `/month/${month.slug}`),
  };
}

export default async function MonthPage({ params, searchParams }: PageProps) {
  const { lang: param, month: slug } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const number = parseMonth(slug);
  const months = await listMonths(lang);
  const month = months.find((m) => m.month === number);
  if (!month) notFound();

  // `inSeason` handles seasons that run across New Year (November → March).
  const result = await listPlaces({
    month: month.month,
    page: pageParam((await searchParams).page),
    pageSize: PAGE_SIZE,
    lang,
  });
  const base = localePath(locale, `/month/${month.slug}`);
  const now = currentMonth();

  return (
    <PageContainer>
      <PageHeader
        title={t("lists.monthTitle", { month: month.name, count: month.count })}
        intro={t("lists.monthIntro", { month: month.name })}
      />
      <ChipRow label={t("lists.monthsLabel")}>
        {months.map((m) => (
          <FilterChip
            key={m.month}
            href={localePath(locale, `/month/${m.slug}`)}
            selected={m.month === month.month}
            count={formatNumber(m.count, lang)}
            icon={m.month === now ? "calendar" : undefined}
          >
            {m.name}
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
