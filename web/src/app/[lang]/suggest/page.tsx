import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SuggestForm } from "@/components/community/SuggestForm";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { contentLocale, isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { firstParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { listDistrictsByDivision } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("suggest.metaTitle"),
    description: t("suggest.metaDescription"),
    alternates: alternatesFor(lang, "/suggest"),
  };
}

/** `/suggest?kind=place|food` (FEATURES.md §6.5): visitor suggestions for the home page. */
export default async function SuggestPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const t = getT(param);
  const groups = await listDistrictsByDivision(contentLocale(param));
  const kind = firstParam((await searchParams).kind);
  return (
    <PageContainer className="max-w-[880px]">
      <PageHeader title={t("suggest.title")} intro={t("suggest.intro")} />
      <SuggestForm
        divisions={groups.map((g) => ({
          slug: g.slug,
          name: g.name,
          districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
        }))}
        initialTab={kind === "food" || kind === "product" ? "food" : "place"}
      />
    </PageContainer>
  );
}
