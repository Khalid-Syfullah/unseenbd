import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UploadForm } from "@/components/community/UploadForm";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { contentLocale, isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { firstParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { allPlaces, listDistrictsByDivision } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("upload.metaTitle"),
    description: t("upload.metaDescription"),
    alternates: alternatesFor(lang, "/upload"),
  };
}

/** `/upload?district=&place=` (FEATURES.md §6.3): add up to three photos, no account needed. */
export default async function UploadPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const t = getT(param);
  const lang = contentLocale(param);
  const query = await searchParams;
  const [groups, places] = await Promise.all([listDistrictsByDivision(lang), allPlaces({ lang })]);
  const districtSlugs = new Set(groups.flatMap((g) => g.districts.map((d) => d.slug)));
  const district = firstParam(query.district);

  return (
    <PageContainer className="max-w-[880px]">
      <PageHeader title={t("upload.title")} intro={t("upload.intro")} />
      <UploadForm
        divisions={groups.map((g) => ({
          slug: g.slug,
          name: g.name,
          districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
        }))}
        places={places.map((p) => ({ slug: p.slug, name: p.name, district: p.district.slug }))}
        initialDistrict={districtSlugs.has(district) ? district : ""}
        initialPlace={firstParam(query.place)}
      />
    </PageContainer>
  );
}
