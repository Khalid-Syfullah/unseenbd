import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NearMe, type NearPlace } from "@/components/discovery/NearMe";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { contentLocale, isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { firstParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { allPlaces, listDistrictsByDivision, listKinds } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

/** Where the list starts when no district is chosen. */
const DEFAULT_FROM = "dhaka";

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("nearMe.title"),
    description: t("nearMe.metaDescription"),
    alternates: alternatesFor(lang, "/near-me"),
  };
}

export default async function NearMePage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);
  const query = await searchParams;

  const [groups, kinds, all] = await Promise.all([
    listDistrictsByDivision(lang),
    listKinds(lang),
    allPlaces({ lang }),
  ]);
  const districts = groups.flatMap((g) => g.districts);
  const wantedFrom = firstParam(query.from);
  const from = districts.some((d) => d.slug === wantedFrom)
    ? wantedFrom
    : (districts.find((d) => d.slug === DEFAULT_FROM) ?? districts[0])!.slug;
  const wantedKind = firstParam(query.kind);
  const kind = kinds.some((k) => k.key === wantedKind) ? wantedKind : "";

  const places: NearPlace[] = all.flatMap((p) =>
    p.lat !== null && p.lng !== null
      ? [
          {
            slug: p.slug,
            name: p.name,
            districtName: p.district.name,
            kindKey: p.kind.key,
            kindLabel: p.kind.label,
            lat: p.lat,
            lng: p.lng,
            cover: p.cover?.w640 ?? null,
          },
        ]
      : [],
  );

  return (
    <PageContainer>
      <PageHeader title={t("nearMe.title")} intro={t("nearMe.intro")} />
      <NearMe
        places={places}
        districts={districts.map((d) => ({ slug: d.slug, name: d.name, lat: d.lat, lng: d.lng }))}
        districtGroups={groups.map((g) => ({
          slug: g.slug,
          name: g.name,
          districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
        }))}
        kinds={kinds.map((k) => ({ key: k.key, label: k.label }))}
        initialFrom={from}
        initialKind={kind}
      />
    </PageContainer>
  );
}
