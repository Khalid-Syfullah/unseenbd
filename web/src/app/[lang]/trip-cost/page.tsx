import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { TripCost } from "@/components/planner/TripCost";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { SearchParams } from "@/lib/params";
import { districtResolver, parseTripCostQuery } from "@/lib/planner/url";
import { alternatesFor, ogImages } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { getPlannerData } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

/** Where the calculator starts when the URL does not say. */
const DEFAULT_FROM = "dhaka";

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("tripCost.title"),
    description: t("tripCost.metaDescription"),
    alternates: alternatesFor(lang, "/trip-cost"),
    openGraph: {
      images: ogImages(lang),
      title: t("tripCost.title"),
      description: t("tripCost.metaDescription"),
      url: localePath(lang, "/trip-cost"),
    },
  };
}

export default async function TripCostPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const [data, query] = await Promise.all([getPlannerData(contentLocale(locale)), searchParams]);
  const resolve = districtResolver(data.districts);
  const initial = parseTripCostQuery(query, {
    resolve,
    defaultFrom: resolve(DEFAULT_FROM) ?? data.districts[0]!.id,
  });

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("tripCost.title") },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href ?? localePath(locale, "/trip-cost")}`,
    })),
  };

  return (
    <PageContainer className="gap-8">
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <PageHeader title={t("tripCost.title")} intro={t("tripCost.intro")} />
      <TripCost divisions={data.divisions} districts={data.districts} initial={initial} />
    </PageContainer>
  );
}
