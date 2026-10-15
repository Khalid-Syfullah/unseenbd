import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { TrainList } from "@/components/routes/TrainList";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { alternatesFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { listDistricts, listTrains } from "@/server/data";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("trains.title"),
    description: t("trains.metaDescription"),
    alternates: alternatesFor(lang, "/trains"),
    openGraph: {
      title: t("trains.title"),
      description: t("trains.metaDescription"),
      url: localePath(lang, "/trains"),
    },
  };
}

export default async function TrainsPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const [trains, allDistricts] = await Promise.all([listTrains(lang), listDistricts(lang)]);
  const used = new Set(trains.flatMap((tr) => tr.districtIds));
  const districts = allDistricts
    .filter((d) => used.has(d.id))
    .map((d) => ({ id: d.id, name: d.name }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("nav.trains") },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href ?? localePath(locale, "/trains")}`,
    })),
  };

  return (
    <PageContainer>
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <PageHeader title={t("trains.title")} intro={t("trains.intro", { count: trains.length })} />
      <TrainList
        districts={districts}
        trains={trains.map((tr) => ({
          slug: tr.slug,
          no: tr.no,
          name: tr.name,
          from: tr.from,
          to: tr.to,
          dep: tr.dep,
          arr: tr.arr,
          minutes: tr.minutes,
          offDay: tr.offDay,
          stations: tr.stations,
          districtIds: tr.districtIds,
        }))}
      />
    </PageContainer>
  );
}
