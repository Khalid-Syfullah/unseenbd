import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { MyBangladesh } from "@/components/my-map/MyBangladesh";
import { SharedBangladesh } from "@/components/my-map/SharedBangladesh";
import { myMapDivisions } from "@/components/my-map/data";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { SearchParams } from "@/lib/params";
import { alternatesFor, ogImages } from "@/lib/seo";
import { parseDistrictShare } from "@/lib/visited/encode";
import { getDistrictCovers, getMyBangladeshLevels } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  const shared = parseDistrictShare(await searchParams);
  if (shared) {
    const title = shared.name
      ? t("myBd.sharedTitle", { name: shared.name })
      : t("myBd.sharedTitleAnon");
    const description = shared.name
      ? t("myBd.sharedLine", { name: shared.name, count: shared.ids.length })
      : t("myBd.sharedLineAnon", { count: shared.ids.length });
    return {
      title,
      description,
      robots: { index: false, follow: true },
      alternates: { canonical: localePath(lang, "/my-bangladesh") },
      openGraph: {
        images: ogImages(lang),
        title,
        description,
      },
    };
  }
  return {
    title: t("myBd.title"),
    description: t("myBd.metaDescription"),
    alternates: alternatesFor(lang, "/my-bangladesh"),
    openGraph: {
      title: t("myBd.title"),
      description: t("myBd.metaDescription"),
      url: localePath(lang, "/my-bangladesh"),
    },
  };
}

export default async function MyBangladeshPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const [divisions, levels, covers, query] = await Promise.all([
    myMapDivisions(locale),
    getMyBangladeshLevels(contentLocale(locale)),
    getDistrictCovers(),
    searchParams,
  ]);

  const shared = parseDistrictShare(query);
  if (shared) {
    return (
      <PageContainer className="gap-8">
        <SharedBangladesh
          locale={locale}
          ids={shared.ids}
          name={shared.name}
          divisions={divisions}
          levels={levels}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="gap-8">
      <PageHeader title={t("myBd.title")} intro={t("myBd.intro")} />
      <MyBangladesh divisions={divisions} levels={levels} covers={covers} />
    </PageContainer>
  );
}
