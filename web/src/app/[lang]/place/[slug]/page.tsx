import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { EmbedCode } from "@/components/place/EmbedCode";
import { ListenButton } from "@/components/place/ListenButton";
import { ListingGrid } from "@/components/place/ListingGrid";
import { PlaceActions } from "@/components/place/PlaceActions";
import { TipButton } from "@/components/place/TipButton";
import { ViewRecorder } from "@/components/place/ViewRecorder";
import { buttonClasses, ButtonLink, TextLink } from "@/components/ui/Button";
import { CardGrid } from "@/components/ui/Card";
import { isKind, KindBadge, StatusTag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import {
  formatDistance,
  formatDuration,
  formatMoney,
  formatMonthRange,
  formatNumber,
} from "@/lib/format";
import { haversineKm, directionsUrl } from "@/lib/geo";
import {
  checklistGroup,
  embedSnippet,
  ESSENTIALS,
  mapsSearchUrl,
  oneDayTrip,
  type ChecklistGroup,
} from "@/lib/place";
import { alternatesFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import {
  allPlaces,
  getPlace,
  getTrendVotes,
  listDistrictListings,
  listPlacePhotos,
} from "@/server/data";

type PageProps = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const all = await allPlaces({});
  return (["bn", "en"] as const).flatMap((lang) => all.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const place = await getPlace(slug, contentLocale(lang));
  if (!place) return {};
  const t = getT(lang);
  const title = t("place.metaTitle", { name: place.name, district: place.district.name });
  const description = t("place.metaDescription", {
    name: place.name,
    district: place.district.name,
    division: place.division.name,
  });
  const image = place.photo?.src ?? place.cover?.w1200;
  return {
    title,
    description,
    alternates: alternatesFor(lang, `/place/${place.slug}`),
    openGraph: {
      title,
      description,
      type: "article",
      url: localePath(lang, `/place/${place.slug}`),
      images: image ? [{ url: image, width: 1200, height: 800, alt: place.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: { "max-image-preview": "large" } as Metadata["robots"],
  };
}

const CHECKLIST: Record<
  ChecklistGroup,
  readonly (
    | "chkSun"
    | "chkBoat"
    | "chkShoes"
    | "chkRain"
    | "chkModest"
    | "chkShoesOff"
    | "chkLocal"
    | "chkBags"
  )[]
> = {
  water: ["chkSun", "chkBoat"],
  trek: ["chkShoes", "chkRain"],
  culture: ["chkModest", "chkShoesOff"],
  town: ["chkLocal", "chkBags"],
};
const BASE_CHECKLIST = ["chkId", "chkCash", "chkWater", "chkWeather", "chkOffline"] as const;

const ESSENTIAL_ICON: Record<(typeof ESSENTIALS)[number]["key"], IconName> = {
  hotels: "bed",
  food: "food",
  worship: "kinds/spiritual",
  hospital: "emergency",
  police: "shield",
  atm: "wallet",
  toilets: "pin",
};
const ESSENTIAL_LABEL = {
  hotels: "place.essHotels",
  food: "place.essFood",
  worship: "place.essWorship",
  hospital: "place.essHospital",
  police: "place.essPolice",
  atm: "place.essAtm",
  toilets: "place.essToilets",
} as const;

function Fact({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-40 items-center gap-3 rounded-lg border border-border bg-raised p-3">
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

export default async function PlacePage({ params }: PageProps) {
  const { lang: param, slug } = await params;
  if (!isLocale(param)) notFound();
  const locale: Locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const place = await getPlace(slug, lang);
  if (!place) notFound();

  const [trendVotes, travellerPhotos, listings, moreRaw] = await Promise.all([
    getTrendVotes(place.slug),
    listPlacePhotos(place.id, lang, 6),
    listDistrictListings(place.district.id, 6),
    allPlaces({ district: place.district.slug, lang }),
  ]);
  const more = moreRaw.filter((p) => p.slug !== place.slug).slice(0, 4);

  const { lat, lng } = place;
  const hasPoint = lat !== null && lng !== null;
  const path = `/place/${place.slug}`;
  const url = `${SITE_URL}${localePath(locale, path)}`;
  const districtHref = localePath(locale, `/district/${place.district.slug}`);
  const divisionHref = `${localePath(locale, "/best-places")}?division=${place.division.slug}`;
  const routeHref = place.fromDhaka?.routeSlug
    ? localePath(locale, `/route/${place.fromDhaka.routeSlug}`)
    : null;

  // Nearby places with distances for the comparison table and the day trip.
  const nearby = place.nearby.map((n) => ({
    ...n,
    distanceKm:
      hasPoint && n.lat !== null && n.lng !== null ? haversineKm(lat, lng, n.lat, n.lng) : null,
  }));
  const day = oneDayTrip(
    { slug: place.slug, name: place.name, visitHours: place.visitHours },
    nearby.map((n) => ({ slug: n.slug, name: n.name, visitHours: n.visitHours })),
  );

  const intro = place.description;
  const cover = place.photo ?? null;
  const coverSrc = cover?.src ?? place.cover?.w1200 ?? null;
  const credit =
    cover && place.imageCredit
      ? t("place.creditPhoto", { by: place.imageCredit.by, license: place.imageCredit.license })
      : t("place.creditIllustration");
  const group = checklistGroup(place.kind.key);
  const checklist = [...BASE_CHECKLIST, ...CHECKLIST[group]];

  const fromDhakaValue = place.fromDhaka
    ? place.fromDhaka.busFareFromBdt
      ? t("place.fromDhakaFact", {
          km: formatDistance(place.fromDhaka.roadKm, lang),
          fare: formatMoney(place.fromDhaka.busFareFromBdt, lang),
        })
      : formatDistance(place.fromDhaka.roadKm, lang)
    : null;

  const breadcrumbItems = [
    { label: t("nav.explore"), href: localePath(locale, "/explore") },
    { label: place.division.name, href: divisionHref },
    { label: place.district.name, href: districtHref },
    { label: place.name },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristAttraction",
        name: place.name,
        description: intro ?? undefined,
        url,
        image: coverSrc ? `${SITE_URL}${coverSrc}` : undefined,
        touristType: place.kind.label,
        geo: hasPoint ? { "@type": "GeoCoordinates", latitude: lat, longitude: lng } : undefined,
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: `${place.district.name}, ${place.division.name}`,
        },
        isAccessibleForFree: undefined,
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

  const actions = <PlaceActions slug={place.slug} name={place.name} trendCount={trendVotes} />;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:px-8">
      <JsonLd data={jsonLd} />
      <ViewRecorder placeId={place.id} districtId={place.district.id} />
      <Breadcrumb items={breadcrumbItems} label={t("place.breadcrumb")} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          <header className="flex flex-col gap-4">
            <figure className="-mx-4 flex flex-col gap-1.5 md:mx-0">
              <div className="relative aspect-[3/2] overflow-hidden bg-surface-2 md:rounded-lg">
                {coverSrc ? (
                  <Image
                    src={coverSrc}
                    alt={
                      cover
                        ? ((lang === "bn" ? cover.alt_bn : cover.alt_en) ?? place.name)
                        : place.name
                    }
                    width={1200}
                    height={800}
                    unoptimized
                    priority
                    className="size-full object-cover"
                  />
                ) : null}
              </div>
              <figcaption className="px-4 text-sm text-muted md:px-0">{credit}</figcaption>
            </figure>
            <div className="flex flex-wrap items-center gap-2">
              {isKind(place.kind.key) ? (
                <KindBadge kind={place.kind.key} label={place.kind.label} />
              ) : null}
              {place.unseen ? <StatusTag tone="info">{t("common.unseen")}</StatusTag> : null}
            </div>
            <h1 className="text-h1 text-balance">{place.name}</h1>
            <p className="text-lg text-muted">
              <Link href={districtHref} className="text-primary underline-offset-2 hover:underline">
                {place.district.name}
              </Link>{" "}
              · {place.division.name}
            </p>
            <div className="lg:hidden">{actions}</div>
          </header>

          <dl className="flex flex-wrap gap-3" aria-label={t("place.factsLabel")}>
            <Fact icon="calendar" label={t("common.bestTime")}>
              {formatMonthRange(place.bestFromMonth, place.bestToMonth, lang)}
            </Fact>
            <Fact icon="clock" label={t("common.timeNeeded")}>
              {formatDuration(place.visitHours, lang)}
            </Fact>
            {fromDhakaValue ? (
              <Fact icon="bus" label={t("common.fromDhaka")}>
                {fromDhakaValue}
              </Fact>
            ) : null}
          </dl>

          <PageSection id="see" title={t("place.seeTitle")}>
            {intro ? (
              <p className="max-w-[68ch] text-lg">{intro}</p>
            ) : (
              <p className="text-muted">{t("place.seeEmpty")}</p>
            )}
          </PageSection>

          <PageSection id="how" title={t("place.howTitle")}>
            <p className="max-w-[68ch] text-lg">{place.howToGetThere ?? t("place.howEmpty")}</p>
            {routeHref ? (
              <TextLink href={routeHref} trailingIcon="arrow-right">
                {t("place.routeLink", { district: place.district.name })}
              </TextLink>
            ) : null}
          </PageSection>

          {place.warnings.length || place.tips.length ? (
            <PageSection id="note" title={t("place.noteTitle")}>
              {place.warnings.length ? (
                <div
                  role="note"
                  className="flex flex-col gap-2 rounded-lg border border-danger bg-surface-2 p-4"
                >
                  <h3 className="inline-flex items-center gap-2 text-h3 text-danger">
                    <Icon name="flag" size={20} />
                    {t("place.warningsTitle")}
                  </h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5">
                    {place.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {place.tips.length ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-h3">{t("place.infoTitle")}</h3>
                  <ul className="flex list-disc flex-col gap-1.5 pl-5">
                    {place.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </PageSection>
          ) : null}

          {hasPoint ? (
            <PageSection id="essentials" title={t("place.essentialsTitle")}>
              <p className="text-muted">{t("place.essentialsIntro")}</p>
              <ul className="flex flex-wrap gap-2">
                {ESSENTIALS.map((e) => (
                  <li key={e.key}>
                    <a
                      href={mapsSearchUrl(e.query, lat, lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      <Icon name={ESSENTIAL_ICON[e.key]} size={16} />
                      {t(ESSENTIAL_LABEL[e.key])}
                      <Icon name="external" size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            </PageSection>
          ) : null}

          {nearby.length ? (
            <PageSection id="compare" title={t("place.compareTitle")}>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <caption className="sr-only">
                    {t("place.compareCaption", { name: place.name })}
                  </caption>
                  <thead className="bg-surface-2 text-sm">
                    <tr>
                      <th scope="col" className="p-3 font-semibold">
                        {t("place.compareName")}
                      </th>
                      <th scope="col" className="p-3 font-semibold">
                        {t("common.kind")}
                      </th>
                      <th scope="col" className="p-3 font-semibold">
                        {t("place.compareDistance")}
                      </th>
                      <th scope="col" className="p-3 font-semibold">
                        {t("common.timeNeeded")}
                      </th>
                      <th scope="col" className="p-3 font-semibold">
                        {t("common.bestTime")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    <tr className="border-t border-border bg-primary-wash">
                      <th scope="row" className="p-3 font-semibold">
                        {place.name}{" "}
                        <span className="font-normal text-muted">({t("place.compareThis")})</span>
                      </th>
                      <td className="p-3">{place.kind.label}</td>
                      <td className="p-3">–</td>
                      <td className="p-3">{formatDuration(place.visitHours, lang)}</td>
                      <td className="p-3">
                        {formatMonthRange(place.bestFromMonth, place.bestToMonth, lang)}
                      </td>
                    </tr>
                    {nearby.map((n) => (
                      <tr key={n.slug} className="border-t border-border">
                        <th scope="row" className="p-3 font-semibold">
                          <Link
                            href={localePath(locale, `/place/${n.slug}`)}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {n.name}
                          </Link>
                        </th>
                        <td className="p-3">{n.kind.label}</td>
                        <td className="p-3">
                          {n.distanceKm === null ? "–" : formatDistance(n.distanceKm, lang)}
                        </td>
                        <td className="p-3">{formatDuration(n.visitHours, lang)}</td>
                        <td className="p-3">
                          {formatMonthRange(n.bestFromMonth, n.bestToMonth, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PageSection>
          ) : null}

          {intro ? <ListenButton text={`${place.name}. ${intro}`} /> : null}

          {day.stops.length ? (
            <PageSection id="day" title={t("place.dayTitle")}>
              <p className="text-muted">
                {t("place.dayIntro", { hours: formatDuration(day.hours, lang) })}
              </p>
              <ol className="flex flex-col gap-2">
                {day.stops.map((s, i) => (
                  <li
                    key={s.slug}
                    className="flex items-center gap-3 rounded-lg border border-border bg-raised p-3"
                  >
                    <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-on-primary">
                      {formatNumber(i + 1, lang)}
                    </span>
                    {s.slug === place.slug ? (
                      <span className="font-semibold">{s.name}</span>
                    ) : (
                      <Link
                        href={localePath(locale, `/place/${s.slug}`)}
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {s.name}
                      </Link>
                    )}
                    <span className="num ml-auto text-sm text-muted">
                      {formatDuration(s.visitHours, lang)}
                    </span>
                  </li>
                ))}
              </ol>
            </PageSection>
          ) : null}

          <PageSection id="checklist" title={t("place.checklistTitle")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {checklist.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <Icon name="check" size={20} className="mt-0.5 shrink-0 text-primary" />
                  <span>{t(`place.${key}`)}</span>
                </li>
              ))}
            </ul>
          </PageSection>

          <PageSection id="access" title={t("place.accessTitle")}>
            <p className="max-w-[68ch]">{place.accessibility ?? t("place.accessEmpty")}</p>
          </PageSection>

          {hasPoint ? (
            <PageSection id="embed" title={t("place.embedTitle")}>
              <p className="text-muted">{t("place.embedIntro")}</p>
              <EmbedCode code={embedSnippet(place.name, lat, lng)} />
            </PageSection>
          ) : null}

          <PageSection id="info" title={t("place.openTitle")}>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-raised p-4">
                <dt className="text-sm text-muted">{t("place.openingHours")}</dt>
                <dd className="font-semibold">{place.openingHours ?? t("place.checkLocally")}</dd>
              </div>
              <div className="rounded-lg border border-border bg-raised p-4">
                <dt className="text-sm text-muted">{t("place.entryFee")}</dt>
                <dd className="font-semibold">{place.entryFee ?? t("place.checkLocally")}</dd>
              </div>
              <div className="rounded-lg border border-border bg-raised p-4">
                <dt className="text-sm text-muted">{t("place.emergency")}</dt>
                <dd className="font-semibold">
                  <a href="tel:999" className="num text-primary underline">
                    999
                  </a>
                  <span className="block text-sm font-normal text-muted">
                    {t("place.emergencyText")}
                  </span>
                </dd>
              </div>
            </dl>
          </PageSection>

          <PageSection id="photos" title={t("place.photosTitle")}>
            {travellerPhotos.length ? (
              <div className="columns-2 gap-3 md:columns-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
                {travellerPhotos.map((p) => (
                  <PhotoTile
                    key={p.id}
                    photo={{
                      src: p.src,
                      alt: p.caption ?? place.name,
                      width: p.width,
                      height: p.height,
                      caption: p.uploader,
                      likes: p.likes,
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                illustration="upload"
                body={t("place.photosEmpty")}
                action={
                  <ButtonLink
                    href={localePath(locale, "/upload")}
                    icon="camera"
                    variant="secondary"
                  >
                    {t("place.addPhoto")}
                  </ButtonLink>
                }
              />
            )}
          </PageSection>

          {more.length ? (
            <PageSection id="more" title={t("place.moreTitle", { district: place.district.name })}>
              <CardGrid max={4}>
                {more.map((p) => (
                  <PlaceCard key={p.slug} place={p} headingLevel={3} />
                ))}
              </CardGrid>
            </PageSection>
          ) : null}

          <PageSection id="stay" title={t("place.stayTitle", { district: place.district.name })}>
            {listings.length ? (
              <ListingGrid listings={listings} />
            ) : (
              <EmptyState
                illustration={null}
                body={t("place.stayEmpty")}
                action={
                  <ButtonLink href={localePath(locale, "/add-listing")} variant="secondary">
                    {t("place.addListing")}
                  </ButtonLink>
                }
              />
            )}
          </PageSection>

          <PageSection id="tip" title={t("place.tipTitle")}>
            <p className="text-muted">{t("place.tipBody")}</p>
            <TipButton />
          </PageSection>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-raised p-4">
              <BangladeshMap
                selected={place.district.slug}
                size="mini"
                label={t("place.locator", { name: place.name })}
              />
              <p className="text-sm text-muted">
                {place.district.name} · {place.division.name}
              </p>
            </div>
            {actions}
            {hasPoint ? (
              <ButtonLink
                href={directionsUrl(lat, lng)}
                target="_blank"
                rel="noopener noreferrer"
                icon="directions"
                variant="secondary"
                fullWidth
              >
                {t("common.directions")}
              </ButtonLink>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
