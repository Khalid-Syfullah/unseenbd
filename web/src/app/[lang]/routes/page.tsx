import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { RouteFinder } from "@/components/routes/RouteFinder";
import { CardGrid } from "@/components/ui/Card";
import { RouteCard } from "@/components/ui/RouteCard";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { alternatesFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { listDistrictsByDivision, listRoutesFromDhaka } from "@/server/data";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("routes.title"),
    description: t("routes.metaDescription"),
    alternates: alternatesFor(lang, "/routes"),
    openGraph: {
      title: t("routes.title"),
      description: t("routes.metaDescription"),
      url: localePath(lang, "/routes"),
    },
  };
}

export default async function RoutesPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const [divisions, fromDhaka] = await Promise.all([
    listDistrictsByDivision(lang),
    listRoutesFromDhaka(lang),
  ]);

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("nav.routes") },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href ?? localePath(locale, "/routes")}`,
    })),
  };

  const dhakaName =
    divisions.flatMap((dv) => dv.districts).find((d) => d.slug === "dhaka")?.name ?? "Dhaka";

  const groups = divisions
    .map((dv) => ({
      slug: dv.slug,
      name: dv.name,
      items: fromDhaka.filter((r) => r.district.division === dv.slug),
    }))
    .filter((g) => g.items.length);

  return (
    <PageContainer className="gap-8">
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <PageHeader title={t("routes.title")} intro={t("routes.intro")} />
      <RouteFinder
        divisions={divisions.map((dv) => ({
          slug: dv.slug,
          name: dv.name,
          districts: dv.districts.map((d) => ({ slug: d.slug, name: d.name })),
        }))}
      />
      <PageSection id="from-dhaka" title={t("routes.dhakaTitle", { count: fromDhaka.length })}>
        <p className="max-w-[68ch] text-muted">{t("routes.dhakaIntro")}</p>
        {groups.map((g) => (
          <section key={g.slug} aria-labelledby={`div-${g.slug}`} className="flex flex-col gap-3">
            <h3 id={`div-${g.slug}`} className="text-h3">
              {g.name}
            </h3>
            <CardGrid max={2}>
              {g.items.map((r) => (
                <RouteCard
                  key={r.district.slug}
                  headingLevel={4}
                  route={{
                    from: dhakaName,
                    to: r.district.name,
                    href: localePath(locale, `/route/dhaka-to-${r.district.slug}`),
                    km: r.roadKm,
                    hours: r.busHours,
                    fareFrom: r.busFareFromBdt,
                    trains: r.directTrains,
                  }}
                />
              ))}
            </CardGrid>
          </section>
        ))}
      </PageSection>
    </PageContainer>
  );
}
