import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PostFeedCard } from "@/components/community/PostFeedCard";
import { DistrictsByDivision } from "@/components/home/DistrictsByDivision";
import { DivisionFilter } from "@/components/home/DivisionFilter";
import { JsonLd } from "@/components/home/JsonLd";
import { LinkTile } from "@/components/home/LinkTile";
import { MonthPlaces } from "@/components/home/MonthPlaces";
import { MyMapWidget } from "@/components/home/MyMapWidget";
import { PagedList } from "@/components/home/PagedList";
import { PartnerBanner } from "@/components/home/PartnerBanner";
import { Carousel } from "@/components/home/Carousel";
import { Section } from "@/components/home/Section";
import { SuggestionCard } from "@/components/home/SuggestionCard";
import { TrendMeta } from "@/components/home/TrendMeta";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { CardGrid, FeatureCard } from "@/components/ui/Card";
import { ChipRow, FilterChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { SearchInput } from "@/components/ui/Form";
import { Accordion } from "@/components/ui/Navigation";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { PlaceRow } from "@/components/ui/PlaceCard";
import { RouteCard } from "@/components/ui/RouteCard";
import { PARTNER_BANNER } from "@/config/site";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { localizeDigits, monthName } from "@/lib/format";
import { alternatesFor } from "@/lib/seo";
import { currentMonth, inSeason } from "@/lib/season";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  allPlaces,
  getDistrictRef,
  listApprovedSuggestions,
  listDistrictsByDivision,
  listDivisions,
  listKinds,
  listLatestPhotos,
  listLatestPosts,
  listMonths,
  listPlaces,
  listPopular,
  listRoutesFromDhaka,
  listTrending,
} from "@/server/data";

type PageProps = {
  params: Promise<{ lang: string }>;
};

/** The month sections follow the calendar and the community blocks follow moderation. */
export const revalidate = 600;

const QUICK_ROUTES = [
  "coxs-bazar",
  "sylhet",
  "chattogram",
  "rajshahi",
  "khulna",
  "barishal",
  "rangpur",
  "bandarban",
];

const TOP_TRENDING = 10;
const MORE_TRENDING_PAGE = 5;
const POSTS_PAGE = 4;
const MONTH_CARDS = 9;
const UNSEEN_PICKS = 5;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { alternates: alternatesFor(lang, "/") };
}

export default async function HomePage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const lang = contentLocale(locale);
  const href = (path: string) => localePath(locale, path);
  const month = currentMonth();
  const thisMonth = monthName(month, lang);

  const [
    divisions,
    districtGroups,
    photos,
    posts,
    suggestions,
    trending,
    popular,
    kinds,
    months,
    monthPlaces,
    unseenAll,
    dhakaRoutes,
    dhaka,
  ] = await Promise.all([
    listDivisions(lang),
    listDistrictsByDivision(lang),
    listLatestPhotos(lang, 12),
    listLatestPosts(POSTS_PAGE * 6, lang),
    listApprovedSuggestions(lang, 10),
    listTrending(lang),
    listPopular(lang),
    listKinds(lang),
    listMonths(lang),
    listPlaces({ month, pageSize: MONTH_CARDS, lang }),
    allPlaces({ unseen: true, lang }),
    listRoutesFromDhaka(lang),
    getDistrictRef("dhaka", lang),
  ]);

  const divisionOptions = divisions.map((d) => ({ slug: d.slug, name: d.name }));
  const unseenPicks = [
    ...unseenAll.filter((p) => inSeason(p.bestFromMonth, p.bestToMonth, month)),
    ...unseenAll.filter((p) => !inSeason(p.bestFromMonth, p.bestToMonth, month)),
  ].slice(0, UNSEEN_PICKS);
  const quickRoutes = QUICK_ROUTES.flatMap((slug) => {
    const r = dhakaRoutes.find((x) => x.district.slug === slug);
    return r?.routeSlug ? [r] : [];
  });

  const topTrending = trending.items.slice(0, TOP_TRENDING);
  const moreTrending = trending.items.slice(TOP_TRENDING);
  const trendRow = (item: (typeof trending.items)[number], rank: number) => (
    <PlaceRow
      key={item.place.slug}
      place={item.place}
      rank={rank}
      meta={
        <TrendMeta
          likes={item.likes}
          votes={item.votes}
          stars={item.stars}
          lang={lang}
          likesLabel={t("ui.likes", { count: item.likes })}
          votesLabel={t("ui.votes", { count: item.votes })}
        />
      }
    />
  );

  const faq = [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `q${n}`,
    question: t(`home.faq.q${n}` as "home.faq.q1"),
    answer: t(`home.faq.a${n}` as "home.faq.a1"),
  }));

  const siteUrl = `${SITE_URL}${href("/")}`.replace(/\/$/, "");
  const logoUrl = `${SITE_URL}/brand/icon-512.png`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: SITE_NAME,
              url: siteUrl,
              inLanguage: lang,
              description: t("meta.description"),
              publisher: { "@id": `${SITE_URL}/#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}${href("/search")}?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: SITE_NAME,
              alternateName: t("home.jsonld.organization"),
              url: SITE_URL,
              logo: { "@type": "ImageObject", url: logoUrl, width: 512, height: 512 },
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />

      {/* 1, 5, 6. Hero: title, pitch, note, quick actions and search */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden bg-surface-2"
      >
        <Image
          src="/illustrations/hero-home.svg"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="-z-10 object-cover object-[75%_center]"
        />
        <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 md:py-14 lg:min-h-[560px] lg:px-8 lg:py-16">
          <div className="flex max-w-[680px] flex-col gap-5 rounded-xl border border-border bg-raised/90 p-5 shadow-2 backdrop-blur-sm md:p-8">
            <p className="text-sm font-semibold text-primary">{t("home.hero.kicker")}</p>
            <h1 id="hero-title" className="font-display text-hero text-balance">
              {t("home.hero.title")}
            </h1>
            <p className="max-w-[56ch] text-lg">{t("home.hero.pitch")}</p>
            <p className="inline-flex w-fit items-center gap-2 rounded-pill bg-primary-wash px-3 py-1 text-sm font-semibold text-primary">
              {t("common.freeNoTrackers")}
            </p>
            <nav aria-label={t("home.hero.actions")} className="flex flex-wrap gap-3">
              <ButtonLink
                href={href("/my-bangladesh")}
                variant="accent"
                size="lg"
                icon="my-map"
                fullWidth="mobile"
              >
                {t("home.hero.ctaMap")}
              </ButtonLink>
              <ButtonLink href={href("/plan")} variant="secondary" icon="planner">
                {t("home.hero.ctaPlan")}
              </ButtonLink>
              <ButtonLink href={href("/play")} variant="secondary" icon="quiz">
                {t("home.hero.ctaQuiz")}
              </ButtonLink>
              <ButtonLink href={href("/profile?new=post")} variant="secondary" icon="comment">
                {t("home.hero.ctaPost")}
              </ButtonLink>
              <ButtonLink href={href("/upload")} variant="secondary" icon="camera">
                {t("home.hero.ctaPhoto")}
              </ButtonLink>
            </nav>
            <SearchInput
              action={href("/search")}
              label={t("home.hero.searchLabel")}
              placeholder={t("home.hero.searchPlaceholder")}
            />
          </div>
        </div>
      </section>

      {/* 2. Partner banner (config/site.ts, can be switched off) */}
      {PARTNER_BANNER.enabled ? (
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 md:px-6 lg:px-8">
          <PartnerBanner
            name={PARTNER_BANNER.name}
            url={PARTNER_BANNER.url}
            text={PARTNER_BANNER.text[lang]}
            categories={PARTNER_BANNER.categories.map((c) => c[lang])}
          />
        </div>
      ) : null}

      {/* 3. Directory tiles */}
      <Section id="directory" title={t("home.directory.title")} className="pb-2 md:pb-3">
        <CardGrid max={3}>
          <LinkTile
            href={href("/stay")}
            icon="bed"
            title={t("home.directory.hotelsTitle")}
            body={t("home.directory.hotelsBody")}
          />
          <LinkTile
            href={href("/stay?type=resorts")}
            icon="sun"
            title={t("home.directory.resortsTitle")}
            body={t("home.directory.resortsBody")}
          />
          <LinkTile
            href={href("/restaurants")}
            icon="food"
            title={t("home.directory.eatTitle")}
            body={t("home.directory.eatBody")}
          />
        </CardGrid>
      </Section>

      {/* 4. Owner submission tiles */}
      <Section id="owner" title={t("home.owner.title")} className="pt-2 md:pt-3">
        <CardGrid max={3}>
          <LinkTile
            tone="accent"
            href={href("/add-listing?kind=business")}
            icon="plus"
            title={t("home.owner.business")}
          />
          <LinkTile
            tone="accent"
            href={href("/add-listing?kind=food")}
            icon="plus"
            title={t("home.owner.food")}
          />
          <LinkTile
            tone="accent"
            href={href("/add-listing?kind=product")}
            icon="plus"
            title={t("home.owner.product")}
          />
        </CardGrid>
      </Section>

      {/* 7. My map */}
      <Section id="my-map" title={t("home.myMap.title")}>
        <MyMapWidget />
      </Section>

      {/* 8. Latest traveller photos */}
      <Section
        id="photos"
        title={t("home.photos.title")}
        action={
          photos.length ? (
            <TextLink href={href("/gallery")} trailingIcon="arrow-right">
              {t("common.seeAll")}
            </TextLink>
          ) : undefined
        }
      >
        {photos.length ? (
          <Carousel
            label={t("home.photos.title")}
            previousLabel={t("home.photos.previous")}
            nextLabel={t("home.photos.next")}
          >
            {photos.map((p) => (
              <PhotoTile
                key={p.id}
                photo={{
                  src: p.thumb ?? p.src,
                  alt: t("home.photos.alt", { district: p.district.name }),
                  width: p.width,
                  height: p.height,
                  caption: p.district.name,
                  likes: p.likes,
                  href: href(`/photo/${p.id}`),
                }}
              />
            ))}
          </Carousel>
        ) : (
          <EmptyState
            illustration="upload"
            body={t("home.photos.empty")}
            action={
              <ButtonLink href={href("/upload")} icon="camera">
                {t("home.photos.emptyAction")}
              </ButtonLink>
            }
          />
        )}
      </Section>

      {/* 9. Traveller posts */}
      <Section
        id="posts"
        title={t("home.posts.title")}
        action={
          <ButtonLink href={href("/profile?new=post")} variant="secondary" size="sm" icon="plus">
            {t("home.posts.create")}
          </ButtonLink>
        }
      >
        {posts.length ? (
          <PagedList
            pageSize={POSTS_PAGE}
            className="grid items-start gap-3 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4"
            items={posts.map((p) => (
              <PostFeedCard key={p.id} post={p} />
            ))}
          />
        ) : (
          <EmptyState illustration="empty-map" body={t("home.posts.empty")} />
        )}
      </Section>

      {/* 10. Approved visitor suggestions */}
      <Section
        id="suggestions"
        title={t("home.suggestions.title")}
        action={
          <div className="flex flex-wrap gap-x-4">
            <TextLink href={href("/suggest?kind=place")} icon="plus">
              {t("home.suggestions.addPlace")}
            </TextLink>
            <TextLink href={href("/suggest?kind=food")} icon="plus">
              {t("home.suggestions.addFood")}
            </TextLink>
          </div>
        }
      >
        {suggestions.length ? (
          <Carousel
            label={t("home.suggestions.title")}
            previousLabel={t("home.photos.previous")}
            nextLabel={t("home.photos.next")}
          >
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </Carousel>
        ) : (
          <EmptyState illustration="empty-map" body={t("home.suggestions.empty")} />
        )}
      </Section>

      {/* 11. Trending this season */}
      <Section
        id="trending"
        title={t("home.trending.title")}
        intro={t("trend.seasonNote", {
          season: t(`trend.season.${trending.season.season}`, {
            year: localizeDigits(String(trending.season.year), lang),
          }),
        })}
      >
        {topTrending.length ? (
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="flex flex-col gap-2">
              <h3 className="text-h3">{t("home.trending.top")}</h3>
              <ol className="flex flex-col">
                {topTrending.map((item, i) => (
                  <li key={item.place.slug}>{trendRow(item, i + 1)}</li>
                ))}
              </ol>
            </div>
            {moreTrending.length ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-h3">{t("home.trending.more")}</h3>
                <PagedList
                  pageSize={MORE_TRENDING_PAGE}
                  className="flex flex-col"
                  items={moreTrending.map((item, i) => trendRow(item, TOP_TRENDING + i + 1))}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState illustration="empty-map" body={t("home.trending.empty")} />
        )}
      </Section>

      {/* 12. Popular destinations */}
      <Section id="popular" title={t("home.popular.title")} intro={t("home.popular.intro")}>
        <DivisionFilter
          divisions={divisionOptions}
          label={t("home.popular.filter")}
          emptyText={t("home.popular.empty")}
          items={popular.map((p) => ({
            id: p.slug,
            division: p.division.slug,
            node: <PlaceCard key={p.slug} place={p} headingLevel={3} />,
          }))}
        />
      </Section>

      {/* 13. How much have you seen? */}
      <div className="mx-auto w-full max-w-[1200px] px-4 py-4 md:px-6 lg:px-8">
        <section
          aria-labelledby="seen-title"
          className="flex flex-col gap-4 rounded-xl bg-accent-wash p-6 text-on-accent-wash md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div className="flex max-w-[60ch] flex-col gap-1">
            <h2 id="seen-title" className="text-h1 text-balance">
              {t("home.seen.title")}
            </h2>
            <p>{t("home.seen.body")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={href("/my-bangladesh")} variant="accent" size="lg" icon="my-map">
              {t("home.seen.ctaMap")}
            </ButtonLink>
            <ButtonLink href={href("/play")} variant="secondary" size="lg" icon="quiz">
              {t("home.seen.ctaPlay")}
            </ButtonLink>
          </div>
        </section>
      </div>

      {/* 14. What is Unseen Bangladesh? */}
      <Section id="about" title={t("home.about.title")}>
        <div className="flex max-w-[70ch] flex-col gap-3 text-lg">
          <p>{t("home.about.body1")}</p>
          <p>{t("home.about.body2")}</p>
          <TextLink href={href("/about")} trailingIcon="arrow-right" className="w-fit">
            {t("home.about.link")}
          </TextLink>
        </div>
      </Section>

      {/* 15. Where is your heart today? */}
      <Section id="kinds" title={t("home.kinds.title")} className="pb-2 md:pb-3">
        <ChipRow label={t("home.kinds.label")}>
          {kinds.map((k) => (
            <FilterChip
              key={k.key}
              href={href(`/kind/${k.key}`)}
              icon={`kinds/${k.key}` as `kinds/beach`}
              count={k.count}
            >
              {k.label}
            </FilterChip>
          ))}
          <FilterChip href={href("/explore")}>{t("home.kinds.all")}</FilterChip>
        </ChipRow>
      </Section>

      {/* 16. By month + current month with division filter */}
      <Section
        id="months"
        title={t("home.months.title")}
        className="pt-2 md:pt-3"
        action={
          <TextLink href={href(`/month/${months[month - 1]!.slug}`)} trailingIcon="arrow-right">
            {t("home.months.seeAll", { month: thisMonth })}
          </TextLink>
        }
      >
        <div className="flex flex-col gap-8">
          <ChipRow label={t("home.months.label")}>
            {months.map((m) => (
              <FilterChip
                key={m.month}
                href={href(`/month/${m.slug}`)}
                selected={m.month === month}
                count={m.count}
              >
                {monthName(m.month, lang, { short: true })}
              </FilterChip>
            ))}
          </ChipRow>
          <div className="flex flex-col gap-4">
            <h3 className="text-h2">{t("home.months.thisMonth", { month: thisMonth })}</h3>
            <MonthPlaces
              month={month}
              divisions={divisionOptions}
              pageSize={MONTH_CARDS}
              label={t("home.months.filter")}
              emptyText={t("home.months.empty")}
              errorText={t("home.months.loadError")}
              initial={monthPlaces.items.map((p) => (
                <PlaceCard key={p.slug} place={p} />
              ))}
            />
          </div>
        </div>
      </Section>

      {/* 17. Off the beaten path */}
      <Section
        id="unseen"
        title={t("home.unseen.title")}
        intro={t("home.unseen.intro")}
        action={
          <TextLink href={href("/unseen")} trailingIcon="arrow-right">
            {t("home.unseen.seeAll")}
          </TextLink>
        }
      >
        <CardGrid max={3}>
          {unseenPicks.map((p) => (
            <PlaceCard
              key={p.slug}
              place={p}
              goodThisMonth={inSeason(p.bestFromMonth, p.bestToMonth, month)}
            />
          ))}
        </CardGrid>
      </Section>

      {/* 18. 64 districts, one by one */}
      <Section id="districts" title={t("home.districts.title")} intro={t("home.districts.legend")}>
        <DistrictsByDivision
          divisions={districtGroups.map((g) => ({
            slug: g.slug,
            name: g.name,
            districts: g.districts.map((d) => ({
              slug: d.slug,
              name: d.name,
              href: href(`/district/${d.slug}`),
            })),
          }))}
        />
      </Section>

      {/* 19. Which way, how much? */}
      <Section
        id="routes"
        title={t("home.routes.title")}
        intro={t("home.routes.intro")}
        action={
          <div className="flex flex-wrap gap-x-4">
            <TextLink href={href("/trains")} icon="train">
              {t("home.routes.trains")}
            </TextLink>
            <TextLink href={href("/routes")} trailingIcon="arrow-right">
              {t("home.routes.all")}
            </TextLink>
          </div>
        }
      >
        <CardGrid max={4}>
          {quickRoutes.map((r) => (
            <RouteCard
              key={r.district.slug}
              route={{
                from: dhaka?.name ?? "Dhaka",
                to: r.district.name,
                href: href(`/route/${r.routeSlug}`),
                km: r.roadKm,
                hours: r.busHours,
                fareFrom: r.busFareFromBdt,
                trains: r.directTrains,
              }}
            />
          ))}
        </CardGrid>
      </Section>

      {/* 20. Everything in one place */}
      <Section id="features" title={t("home.features.title")}>
        <CardGrid max={3}>
          <FeatureCard
            icon="my-map"
            href={href("/my-bangladesh")}
            title={t("home.features.mapTitle")}
            body={t("home.features.mapBody")}
          />
          <FeatureCard
            icon="explore"
            href={href("/explore")}
            title={t("home.features.placesTitle")}
            body={t("home.features.placesBody")}
          />
          <FeatureCard
            icon="planner"
            href={href("/plan")}
            title={t("home.features.plannerTitle")}
            body={t("home.features.plannerBody")}
          />
          <FeatureCard
            icon="gallery"
            href={href("/gallery")}
            title={t("home.features.galleryTitle")}
            body={t("home.features.galleryBody")}
          />
          <FeatureCard
            icon="user"
            href={href("/profile")}
            title={t("home.features.profileTitle")}
            body={t("home.features.profileBody")}
          />
          <FeatureCard
            icon="emergency"
            href={href("/safety")}
            title={t("home.features.safetyTitle")}
            body={t("home.features.safetyBody")}
          />
        </CardGrid>
      </Section>

      {/* 21. FAQ */}
      <Section id="faq" title={t("home.faq.title")} className="pb-12 md:pb-16">
        <Accordion
          className="mx-auto max-w-[760px]"
          items={faq.map((f) => ({
            id: f.id,
            title: f.question,
            content: <p>{f.answer}</p>,
          }))}
        />
      </Section>
    </>
  );
}
