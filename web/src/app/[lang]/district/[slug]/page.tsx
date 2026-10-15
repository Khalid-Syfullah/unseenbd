import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { DistrictActions } from "@/components/place/DistrictActions";
import { ListingGrid } from "@/components/place/ListingGrid";
import { ViewRecorder } from "@/components/place/ViewRecorder";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { CARD, CardGrid } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatDistance, formatHoursRange, formatMinutes, formatMoney } from "@/lib/format";
import { alternatesFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import {
  getDistrict,
  getRoute,
  listDistricts,
  listDistrictListings,
  listDistrictPhotos,
} from "@/server/data";

type PageProps = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const all = await listDistricts("en");
  return (["bn", "en"] as const).flatMap((lang) => all.map((d) => ({ lang, slug: d.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const district = await getDistrict(slug, contentLocale(lang));
  if (!district) return {};
  const t = getT(lang);
  const title = t("district.title", { name: district.name, count: district.placeCount });
  const description = t("district.metaDescription", {
    name: district.name,
    division: district.divisionRef.name,
  });
  const image = district.places.find((p) => p.cover)?.cover?.w1200;
  return {
    title,
    description,
    alternates: alternatesFor(lang, `/district/${district.slug}`),
    openGraph: {
      title,
      description,
      type: "website",
      url: localePath(lang, `/district/${district.slug}`),
      images: image ? [{ url: image, width: 1200, height: 800, alt: district.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function ReachRow({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-wash text-primary">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="num font-semibold">{children}</dd>
      </div>
    </div>
  );
}

export default async function DistrictPage({ params }: PageProps) {
  const { lang: param, slug } = await params;
  if (!isLocale(param)) notFound();
  const locale: Locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const district = await getDistrict(slug, lang);
  if (!district) notFound();

  const dhaka = district.fromDhaka;
  const [route, photos, listings] = await Promise.all([
    dhaka?.routeSlug ? getRoute(dhaka.routeSlug, lang) : Promise.resolve(null),
    listDistrictPhotos(district.id, lang, 6),
    listDistrictListings(district.id, 6),
  ]);

  const title = t("district.title", { name: district.name, count: district.placeCount });
  const url = `${SITE_URL}${localePath(locale, `/district/${district.slug}`)}`;
  const routeHref = dhaka?.routeSlug ? localePath(locale, `/route/${dhaka.routeSlug}`) : null;
  const water = route?.water[0] ?? null;
  const flight = route?.flight ?? null;
  const bus = dhaka?.busHours
    ? t(dhaka.busFareFromBdt ? "district.busLine" : "district.busLineNoFare", {
        km: formatDistance(dhaka.roadKm, lang),
        hours: formatHoursRange(dhaka.busHours[0], dhaka.busHours[1], lang),
        fare: dhaka.busFareFromBdt ? formatMoney(dhaka.busFareFromBdt, lang) : "",
      })
    : dhaka
      ? formatDistance(dhaka.roadKm, lang)
      : null;

  const breadcrumbItems = [
    { label: t("nav.explore"), href: localePath(locale, "/explore") },
    {
      label: district.divisionRef.name,
      href: `${localePath(locale, "/best-places")}?division=${district.divisionRef.slug}`,
    },
    { label: district.name },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AdministrativeArea",
        name: district.name,
        url,
        description: district.intro ?? undefined,
        geo: { "@type": "GeoCoordinates", latitude: district.lat, longitude: district.lng },
        containedInPlace: { "@type": "AdministrativeArea", name: district.divisionRef.name },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.label,
          item: item.href ? `${SITE_URL}${item.href}` : url,
        })),
      },
    ],
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-6 md:px-6 md:py-10 lg:px-8">
      <JsonLd data={jsonLd} />
      <ViewRecorder districtId={district.id} />
      <Breadcrumb items={breadcrumbItems} label={t("place.breadcrumb")} />

      <header className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex flex-col gap-4 md:order-1">
          <h1 className="text-h1 text-balance">{title}</h1>
          <p className="text-lg text-muted">
            {t("district.divisionLine", { division: district.divisionRef.name })}
          </p>
          {district.intro ? <p className="max-w-[68ch] text-lg">{district.intro}</p> : null}
          <DistrictActions slug={district.slug} title={title} />
        </div>
        <div className="mx-auto w-full max-w-[240px] md:order-2">
          <BangladeshMap
            selected={district.slug}
            size="mini"
            label={t("district.locator", { name: district.name })}
          />
        </div>
      </header>

      {district.famousFor.length ? (
        <PageSection id="famous" title={t("district.famousTitle")}>
          <ul className="flex flex-wrap gap-2">
            {district.famousFor.map((item) => (
              <li key={item}>
                <StatusTag tone="good">{item}</StatusTag>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {dhaka ? (
        <PageSection id="reach" title={t("district.reachTitle")}>
          <div className={`${CARD} gap-5 p-5`}>
            {district.howToReach ? <p className="max-w-[68ch]">{district.howToReach}</p> : null}
            <dl className="grid gap-4 sm:grid-cols-2">
              <ReachRow icon="bus" label={t("district.reachBus")}>
                {bus}
              </ReachRow>
              <ReachRow icon="train" label={t("district.reachTrain")}>
                {dhaka.directTrains > 0
                  ? t("district.trainLine", { count: dhaka.directTrains })
                  : t("district.trainNone")}
              </ReachRow>
              <ReachRow icon="launch" label={t("district.reachLaunch")}>
                {water
                  ? t("district.launchLine", { from: water.from, to: water.to })
                  : t("district.launchNone")}
              </ReachRow>
              <ReachRow icon="plane" label={t("district.reachFlight")}>
                {flight
                  ? t("district.flightLine", {
                      airport: flight.airport.name,
                      code: flight.airport.code,
                      time: formatMinutes(flight.minutes, lang),
                    })
                  : t("district.flightNone")}
              </ReachRow>
            </dl>
            {routeHref ? (
              <TextLink href={routeHref} trailingIcon="arrow-right">
                {t("district.routeLink", { name: district.name })}
              </TextLink>
            ) : null}
          </div>
        </PageSection>
      ) : null}

      <PageSection
        id="places"
        title={t("district.placesTitle")}
        aside={
          <span className="num text-muted">
            {t("common.places", { count: district.placeCount })}
          </span>
        }
      >
        {district.places.length ? (
          <CardGrid max={4}>
            {district.places.map((p, i) => (
              <PlaceCard key={p.slug} place={p} priority={i < 4} headingLevel={3} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState body={t("district.placesEmpty")} />
        )}
      </PageSection>

      <PageSection id="photos" title={t("district.photosTitle", { name: district.name })}>
        {photos.length ? (
          <>
            <div className="columns-2 gap-3 md:columns-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
              {photos.map((p) => (
                <PhotoTile
                  key={p.id}
                  photo={{
                    src: p.src,
                    alt: p.caption ?? district.name,
                    width: p.width,
                    height: p.height,
                    caption: p.uploader,
                    likes: p.likes,
                  }}
                />
              ))}
            </div>
            <TextLink
              href={`${localePath(locale, "/gallery")}?district=${district.slug}`}
              trailingIcon="arrow-right"
            >
              {t("district.photosMore")}
            </TextLink>
          </>
        ) : (
          <EmptyState
            illustration="upload"
            body={t("district.photosEmpty", { name: district.name })}
            action={
              <ButtonLink href={localePath(locale, "/upload")} icon="camera" variant="secondary">
                {t("place.addPhoto")}
              </ButtonLink>
            }
          />
        )}
      </PageSection>

      <PageSection id="listings" title={t("district.listingsTitle")}>
        {listings.length ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            illustration={null}
            body={t("district.listingsEmpty")}
            action={
              <ButtonLink href={localePath(locale, "/add-listing")} variant="secondary">
                {t("place.addListing")}
              </ButtonLink>
            }
          />
        )}
      </PageSection>

      {district.nearbyDistricts.length ? (
        <PageSection id="nearby" title={t("district.nearbyTitle")}>
          <ul className="flex flex-wrap gap-2">
            {district.nearbyDistricts.map((n) => (
              <li key={n.slug}>
                <Link
                  href={localePath(locale, `/district/${n.slug}`)}
                  className="tap-target relative inline-flex h-9 items-center gap-2 rounded-pill bg-surface-2 px-3.5 text-sm font-semibold hover:bg-primary-wash"
                >
                  {n.name}
                  <span className="num font-normal text-muted">
                    {formatDistance(n.distanceKm, lang)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}
    </div>
  );
}
