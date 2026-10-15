import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { CardGrid } from "@/components/ui/Card";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { contentLocale, isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatNumber } from "@/lib/format";
import { alternatesFor } from "@/lib/seo";
import { listUnseenByDivision } from "@/server/data";

type PageProps = { params: Promise<{ lang: string }> };

const total = (groups: { count: number }[]) => groups.reduce((sum, g) => sum + g.count, 0);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  const groups = await listUnseenByDivision(contentLocale(lang));
  return {
    title: t("lists.unseenTitle"),
    description: t("lists.unseenMeta", { count: total(groups) }),
    alternates: alternatesFor(lang, "/unseen"),
  };
}

export default async function UnseenPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const groups = (await listUnseenByDivision(lang)).filter((g) => g.count > 0);

  return (
    <PageContainer>
      <PageHeader title={t("lists.unseenTitle")} intro={t("lists.unseenIntro")} />
      <ChipRow label={t("lists.jumpToDivision")}>
        {groups.map((g) => (
          <FilterChip key={g.slug} href={`#division-${g.slug}`} count={formatNumber(g.count, lang)}>
            {g.name}
          </FilterChip>
        ))}
      </ChipRow>
      {groups.map((g) => (
        <PageSection
          key={g.slug}
          id={`division-${g.slug}`}
          title={g.name}
          aside={<span className="num text-muted">{t("common.places", { count: g.count })}</span>}
        >
          <CardGrid max={4}>
            {g.places.map((place) => (
              <PlaceCard key={place.slug} place={place} headingLevel={3} />
            ))}
          </CardGrid>
        </PageSection>
      ))}
    </PageContainer>
  );
}
