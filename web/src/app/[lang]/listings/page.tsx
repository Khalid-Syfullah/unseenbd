import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { QueryPagination } from "@/components/discovery/QueryPagination";
import { OwnerListingGrid } from "@/components/listings/OwnerListingGrid";
import { ButtonLink } from "@/components/ui/Button";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { DistrictSelect } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Feedback";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { MessageKey } from "@/i18n/translate";
import { isListingKind, LISTING_KINDS } from "@/lib/listings/rules";
import { firstParam, pageParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { listDistrictsByDivision } from "@/server/data";
import { countListingsByKind, listListings } from "@/server/data/listings";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("listings.title"),
    description: t("listings.intro"),
    alternates: alternatesFor(lang, "/listings"),
  };
}

/** `/listings?kind=&district=&page=` (FEATURES.md §7.4): businesses, home food and products. */
export default async function ListingsPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const t = getT(param);
  const lang = contentLocale(param);
  const query = await searchParams;
  const kindParam = firstParam(query.kind);
  const kind = isListingKind(kindParam) ? kindParam : null;
  const groups = await listDistrictsByDivision(lang);
  const districtParam = firstParam(query.district);
  const district =
    groups.flatMap((g) => g.districts).find((d) => d.slug === districtParam)?.slug ?? null;
  const [counts, result] = await Promise.all([
    countListingsByKind(),
    listListings({ kind, district }, { page: pageParam(query.page), lang }),
  ]);
  const base = localePath(param, "/listings");
  const link = (k: string | null) => {
    const q = new URLSearchParams();
    if (k) q.set("kind", k);
    if (district) q.set("district", district);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const keep: Record<string, string> = {};
  if (kind) keep.kind = kind;
  if (district) keep.district = district;

  return (
    <PageContainer>
      <PageHeader title={t("listings.title")} intro={t("listings.intro")} />
      <ChipRow label={t("listings.kindLabel")}>
        <FilterChip href={link(null)} selected={kind === null}>
          {t("common.all")}
        </FilterChip>
        {LISTING_KINDS.map((k) => (
          <FilterChip key={k} href={link(k)} selected={kind === k} count={counts[k]}>
            {t(`listings.kind.${k}` as MessageKey)}
          </FilterChip>
        ))}
      </ChipRow>
      <form method="get" action={base} className="flex max-w-xl items-end gap-2">
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
        <div className="flex-1">
          <label htmlFor="listings-district" className="mb-1.5 block text-sm font-semibold">
            {t("common.district")}
          </label>
          <DistrictSelect
            id="listings-district"
            name="district"
            defaultValue={district ?? ""}
            placeholder={t("listings.allDistricts")}
            divisions={groups.map((g) => ({
              slug: g.slug,
              name: g.name,
              districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
            }))}
          />
        </div>
        <Button type="submit" variant="secondary" className="h-12">
          {t("common.filters")}
        </Button>
      </form>
      {result.items.length ? (
        <>
          <OwnerListingGrid items={result.items} headingLevel={2} />
          <QueryPagination
            base={base}
            params={keep}
            page={result.page}
            pageCount={result.pageCount}
          />
        </>
      ) : (
        <EmptyState
          illustration={null}
          body={t("listings.empty")}
          action={
            <ButtonLink href={localePath(param, "/add-listing")} icon="plus">
              {t("nav.addListing")}
            </ButtonLink>
          }
        />
      )}
    </PageContainer>
  );
}
