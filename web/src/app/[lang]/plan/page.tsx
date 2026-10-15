import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { Planner } from "@/components/planner/Planner";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { SearchParams } from "@/lib/params";
import { DEFAULT_LEVEL } from "@/lib/planner/constants";
import type { PlanInput } from "@/lib/planner/types";
import { DEFAULT_PEOPLE, districtResolver, parsePlanQuery } from "@/lib/planner/url";
import { alternatesFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { getPlannerData } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

/** Where a plan starts when the URL does not say. */
const DEFAULT_START = "dhaka";
/** The "Sample: Dhaka → Cox's Bazar" button (MASTER_PROMPT §5.4 acceptance case). */
const SAMPLE_TO = "coxs-bazar";

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("plan.title"),
    description: t("plan.metaDescription"),
    alternates: alternatesFor(lang, "/plan"),
    openGraph: {
      title: t("plan.title"),
      description: t("plan.metaDescription"),
      url: localePath(lang, "/plan"),
    },
  };
}

export default async function PlanPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const [data, query] = await Promise.all([getPlannerData(contentLocale(locale)), searchParams]);

  const resolve = districtResolver(data.districts);
  const dhaka = resolve(DEFAULT_START) ?? data.districts[0]!.id;
  const { add, ...initial } = parsePlanQuery(query, { resolve, defaultStart: dhaka });
  const sample: PlanInput = {
    start: dhaka,
    destinations: [resolve(SAMPLE_TO)!],
    places: [],
    optimize: true,
    returnToStart: true,
    people: DEFAULT_PEOPLE,
    level: DEFAULT_LEVEL,
  };

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("plan.title") },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href ?? localePath(locale, "/plan")}`,
    })),
  };

  return (
    <PageContainer className="gap-8">
      <JsonLd data={jsonLd} />
      <div className="print:hidden">
        <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      </div>
      <PageHeader title={t("plan.title")} intro={t("plan.intro")} className="print:[&>p]:hidden" />
      <Planner
        divisions={data.divisions}
        districts={data.districts}
        places={data.places}
        initial={initial}
        initialAdd={add}
        sample={sample}
      />
    </PageContainer>
  );
}
