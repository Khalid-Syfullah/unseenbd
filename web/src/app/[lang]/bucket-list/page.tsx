import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BucketList, type BucketGroup } from "@/components/discovery/BucketList";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { contentLocale, isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { alternatesFor } from "@/lib/seo";
import { allPlaces, listKinds } from "@/server/data";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("bucket.title"),
    description: t("bucket.metaDescription"),
    alternates: alternatesFor(lang, "/bucket-list"),
  };
}

export default async function BucketListPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const [kinds, places] = await Promise.all([listKinds(lang), allPlaces({ lang })]);
  const groups: BucketGroup[] = kinds
    .map((k) => ({
      key: k.key,
      label: k.label,
      places: places
        .filter((p) => p.kind.key === k.key)
        .map((p) => ({ slug: p.slug, name: p.name, districtName: p.district.name })),
    }))
    .filter((g) => g.places.length > 0);

  return (
    <PageContainer>
      <PageHeader title={t("bucket.title")} intro={t("bucket.intro")} />
      <BucketList groups={groups} />
    </PageContainer>
  );
}
