import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { MyWorld } from "@/components/my-map/MyWorld";
import { SharedWorld } from "@/components/my-map/SharedWorld";
import { isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { parseWorldShare } from "@/lib/visited/encode";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  const shared = parseWorldShare(await searchParams);
  if (shared) {
    const title = shared.name
      ? t("world.sharedTitle", { name: shared.name })
      : t("world.sharedTitleAnon");
    const description = shared.name
      ? t("world.sharedLine", { name: shared.name, count: shared.visited.length })
      : t("world.sharedLineAnon", { count: shared.visited.length });
    return {
      title,
      description,
      robots: { index: false, follow: true },
      alternates: { canonical: localePath(lang, "/world") },
      openGraph: { title, description },
    };
  }
  return {
    title: t("world.title"),
    description: t("world.metaDescription"),
    alternates: alternatesFor(lang, "/world"),
    openGraph: {
      title: t("world.title"),
      description: t("world.metaDescription"),
      url: localePath(lang, "/world"),
    },
  };
}

/** `/world`: My World, or (with `?v=…&w=…`) someone's shared world map. */
export default async function WorldPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const shared = parseWorldShare(await searchParams);

  if (shared) {
    return (
      <PageContainer className="gap-8">
        <SharedWorld visited={shared.visited} wish={shared.wish} name={shared.name} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="gap-8">
      <PageHeader title={t("world.title")} intro={t("world.intro")} />
      <MyWorld />
    </PageContainer>
  );
}
