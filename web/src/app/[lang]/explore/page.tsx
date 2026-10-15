import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DistrictsByDivision } from "@/components/home/DistrictsByDivision";
import { ExploreShell, type ExploreValues } from "@/components/discovery/ExploreShell";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { QueryPagination } from "@/components/discovery/QueryPagination";
import { ButtonLink } from "@/components/ui/Button";
import { CardGrid } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { parseMonth } from "@/lib/months";
import { firstParam, flagParam, pageParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import {
  cleanQuery,
  listDistrictsByDivision,
  listKinds,
  listMonths,
  listPlaces,
  type PlaceFilters,
} from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("explore.title"),
    description: t("explore.metaDescription"),
    alternates: alternatesFor(lang, "/explore"),
  };
}

export default async function ExplorePage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const lang = contentLocale(locale);
  const query = await searchParams;
  const base = localePath(locale, "/explore");

  const [districtGroups, kinds, months] = await Promise.all([
    listDistrictsByDivision(lang),
    listKinds(lang),
    listMonths(lang),
  ]);

  // Unknown values (a district that does not exist, a month of 13) are ignored, not errors.
  const allDistricts = districtGroups.flatMap((g) => g.districts);
  const districtParam = firstParam(query.district);
  const district = allDistricts.find(
    (d) => d.slug === districtParam || String(d.id) === districtParam,
  );
  const kindParam = firstParam(query.kind);
  const kind = kinds.find((k) => k.key === kindParam);
  const month = parseMonth(firstParam(query.month));
  const values: ExploreValues = {
    q: cleanQuery(firstParam(query.q)),
    district: district?.slug ?? "",
    kind: kind?.key ?? "",
    month: month ? String(month) : "",
    unseen: flagParam(query.unseen),
  };

  const filters: PlaceFilters = {
    q: values.q || null,
    district: district?.slug ?? null,
    kind: kind?.key ?? null,
    month,
    unseen: values.unseen || null,
    page: pageParam(query.page),
    pageSize: PAGE_SIZE,
    lang,
  };
  const result = await listPlaces(filters);

  const keep: Record<string, string> = {};
  if (values.q) keep.q = values.q;
  if (values.district) keep.district = values.district;
  if (values.kind) keep.kind = values.kind;
  if (values.month) keep.month = values.month;
  if (values.unseen) keep.unseen = "1";

  const placeCounts = Object.fromEntries(allDistricts.map((d) => [d.slug, d.placeCount]));

  return (
    <PageContainer>
      <PageHeader title={t("explore.title")} intro={t("explore.intro")} />
      <ExploreShell
        base={base}
        values={values}
        districtGroups={districtGroups.map((g) => ({
          slug: g.slug,
          name: g.name,
          districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
        }))}
        kinds={kinds.map((k) => ({ value: k.key, label: k.label }))}
        months={months.map((m) => ({ value: String(m.month), label: m.name }))}
        placeCounts={placeCounts}
      >
        <section aria-labelledby="explore-results" className="flex flex-col gap-4">
          <h2 id="explore-results" className="sr-only">
            {t("explore.results")}
          </h2>
          <p className="num text-sm text-muted" role="status">
            {t("common.results", { count: result.total })}
            {result.pageCount > 1
              ? ` · ${t("common.pageOf", { page: result.page, pages: result.pageCount })}`
              : ""}
          </p>
          {result.items.length ? (
            <CardGrid max={3}>
              {result.items.map((place, i) => (
                <PlaceCard key={place.slug} place={place} priority={i < 3} headingLevel={3} />
              ))}
            </CardGrid>
          ) : (
            <EmptyState
              body={t("common.noResults")}
              action={
                <ButtonLink href={base} variant="secondary" scroll={false}>
                  {t("common.clearFilters")}
                </ButtonLink>
              }
            />
          )}
          <QueryPagination
            base={base}
            params={keep}
            page={result.page}
            pageCount={result.pageCount}
          />
        </section>
      </ExploreShell>

      <PageSection id="districts" title={t("explore.districtsTitle")}>
        <DistrictsByDivision
          divisions={districtGroups.map((g) => ({
            slug: g.slug,
            name: g.name,
            districts: g.districts.map((d) => ({
              slug: d.slug,
              name: d.name,
              href: localePath(locale, `/district/${d.slug}`),
            })),
          }))}
        />
      </PageSection>
    </PageContainer>
  );
}
