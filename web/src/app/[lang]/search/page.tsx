import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { CardGrid } from "@/components/ui/Card";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { DistrictCard } from "@/components/ui/DistrictCard";
import { EmptyState } from "@/components/ui/Feedback";
import { SearchInput } from "@/components/ui/Form";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { PostCard } from "@/components/ui/PostCard";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatNumber } from "@/lib/format";
import { firstParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { cleanQuery, listFamous, searchAll } from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  const q = cleanQuery(firstParam((await searchParams).q));
  return {
    title: q ? t("search.titleFor", { query: q }) : t("search.title"),
    description: t("search.metaDescription"),
    alternates: alternatesFor(lang, "/search"),
    // Result pages for individual queries are not worth indexing.
    robots: q ? { index: false, follow: true } : undefined,
  };
}

/** Search across districts, places, photos and posts. A missing or empty query is a normal page. */
export default async function SearchPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);
  const href = (path: string) => localePath(locale, path);

  const q = cleanQuery(firstParam((await searchParams).q));
  const results = await searchAll(q, lang);
  const famous = results.districts.length ? await listFamous(lang) : [];
  const famousFor = new Map(famous.map((f) => [f.district.slug, f.items]));

  const hasResults =
    results.districts.length + results.totalPlaces + results.totalPhotos + results.totalPosts > 0;

  const groups = [
    { id: "districts", label: t("search.districts"), count: results.districts.length },
    { id: "places", label: t("search.places"), count: results.totalPlaces },
    { id: "photos", label: t("search.photos"), count: results.totalPhotos },
    { id: "posts", label: t("search.posts"), count: results.totalPosts },
  ].filter((g) => g.count > 0);

  const countAside = (shown: number, total: number) => (
    <span className="num text-sm text-muted">
      {shown < total ? t("search.showing", { shown, total }) : formatNumber(total, lang)}
    </span>
  );

  return (
    <PageContainer>
      <PageHeader
        title={q ? t("search.titleFor", { query: q }) : t("search.title")}
        intro={t("search.intro")}
      />
      <SearchInput
        action={href("/search")}
        defaultValue={q}
        label={t("home.hero.searchLabel")}
        placeholder={t("common.searchPlaceholder")}
        key={q}
      />

      {!q ? (
        <EmptyState
          title={t("search.promptTitle")}
          body={t("search.promptBody")}
          action={
            <ButtonLink href={href("/explore")} variant="secondary">
              {t("nav.explore")}
            </ButtonLink>
          }
        />
      ) : !hasResults ? (
        <EmptyState
          title={t("search.emptyTitle")}
          body={t("search.emptyBody", { query: q })}
          action={
            <ButtonLink href={href("/explore")} variant="secondary">
              {t("nav.explore")}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ChipRow label={t("search.jumpTo")}>
            {groups.map((g) => (
              <FilterChip key={g.id} href={`#${g.id}`} count={formatNumber(g.count, lang)}>
                {g.label}
              </FilterChip>
            ))}
          </ChipRow>

          {results.districts.length ? (
            <PageSection
              id="districts"
              title={t("search.districts")}
              aside={countAside(results.districts.length, results.districts.length)}
            >
              <CardGrid max={3}>
                {results.districts.map((d) => (
                  <DistrictCard
                    key={d.slug}
                    headingLevel={3}
                    district={{
                      slug: d.slug,
                      nameBn: d.nameBn,
                      nameEn: d.nameEn,
                      placeCount: d.placeCount,
                      famousFor: famousFor.get(d.slug),
                    }}
                  />
                ))}
              </CardGrid>
            </PageSection>
          ) : null}

          {results.places.length ? (
            <PageSection
              id="places"
              title={t("search.places")}
              aside={countAside(results.places.length, results.totalPlaces)}
            >
              <CardGrid max={4}>
                {results.places.map((place) => (
                  <PlaceCard key={place.slug} place={place} headingLevel={3} />
                ))}
              </CardGrid>
              {results.totalPlaces > results.places.length ? (
                <p>
                  <ButtonLink
                    href={`${href("/explore")}?q=${encodeURIComponent(q)}`}
                    variant="secondary"
                  >
                    {t("search.exploreAll")}
                  </ButtonLink>
                </p>
              ) : null}
            </PageSection>
          ) : null}

          {results.photos.length ? (
            <PageSection
              id="photos"
              title={t("search.photos")}
              aside={countAside(results.photos.length, results.totalPhotos)}
            >
              <div className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3 [&>*]:break-inside-avoid">
                {results.photos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photo={{
                      src: p.src,
                      alt: p.caption ?? t("home.photos.alt", { district: p.district.name }),
                      width: p.width,
                      height: p.height,
                      caption: p.district.name,
                      likes: p.likes,
                      href: href(`/district/${p.district.slug}`),
                    }}
                  />
                ))}
              </div>
            </PageSection>
          ) : null}

          {results.posts.length ? (
            <PageSection
              id="posts"
              title={t("search.posts")}
              aside={countAside(results.posts.length, results.totalPosts)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {results.posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={{
                      author: p.author,
                      date: p.createdAt,
                      text: p.body,
                      photos: p.photos.map((src) => ({
                        src,
                        alt: t("home.posts.photoAlt", { author: p.author }),
                      })),
                      likes: p.likes,
                      comments: p.comments,
                      stars: p.stars ?? undefined,
                    }}
                  />
                ))}
              </div>
            </PageSection>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
