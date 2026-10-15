import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { Provenance } from "@/components/routes/Provenance";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { CARD, CardGrid, StatTile } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PlaceCard } from "@/components/ui/PlaceCard";
import { TrainRow } from "@/components/ui/RouteCard";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import {
  formatDate,
  formatDistance,
  formatHoursRange,
  formatMinutes,
  formatMoney,
  formatMoneyRange,
  formatNumber,
} from "@/lib/format";
import { alternatesFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import {
  getBookingLinks,
  getComputedRoute,
  getRoute,
  listRoutes,
  type BookingLinks,
  type ComputedRoute,
  type RouteDetail,
  type TrainSummary,
} from "@/server/data";
import type { Confidence, RouteFlight, RouteWater } from "@/server/db/json-types";

// Pairs without a curated guide are computed on request.
export const dynamicParams = true;

type PageProps = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const all = await listRoutes("en");
  return (["bn", "en"] as const).flatMap((lang) => all.map((r) => ({ lang, slug: r.slug })));
}

async function load(slug: string, lang: "bn" | "en") {
  const route = await getRoute(slug, lang);
  if (route) return { route, computed: null };
  const computed = await getComputedRoute(slug, lang);
  return { route: null, computed };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const { route, computed } = await load(slug, contentLocale(lang));
  const r = route ?? computed;
  if (!r) return {};
  const t = getT(lang);
  const title = t("route.title", { from: r.from.name, to: r.to.name });
  const description = t("route.metaDescription", { from: r.from.name, to: r.to.name });
  return {
    title,
    description,
    alternates: alternatesFor(lang, `/route/${r.slug}`),
    openGraph: { title, description, url: localePath(lang, `/route/${r.slug}`) },
  };
}

type Tr = ReturnType<typeof getT>;

function Block({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: IconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`${CARD} scroll-mt-24 gap-4 p-4 md:p-6`}
    >
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-h2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-wash text-primary">
          <Icon name={icon} size={20} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num font-semibold">{children}</dd>
    </div>
  );
}

function BusBlock({ route, t, locale }: { route: RouteDetail; t: Tr; locale: Locale }) {
  const bus = route.bus;
  if (!bus) {
    return (
      <Block id="bus" icon="bus" title={t("route.busTitle")}>
        <p className="text-muted">{t("route.busNone")}</p>
      </Block>
    );
  }
  const chart = bus.chart;
  const acLabel = { ac: t("route.opAc"), non: t("route.opNon"), both: t("route.opBoth") };
  return (
    <Block id="bus" icon="bus" title={t("route.busTitle")}>
      <dl className="grid gap-4 sm:grid-cols-2">
        {bus.terminals.length ? (
          <Fact label={t("route.terminals")}>{bus.terminals.join(", ")}</Fact>
        ) : null}
        {bus.arrives ? <Fact label={t("route.arrives")}>{bus.arrives}</Fact> : null}
        {bus.nonAc ? (
          <Fact label={t("route.nonAc")}>
            {formatMoneyRange(bus.nonAc.min, bus.nonAc.max, locale)}
            <span className="block text-xs font-normal text-muted">
              {t("common.asOf", { date: formatDate(bus.nonAc.asOf, locale) })}
            </span>
          </Fact>
        ) : null}
        {bus.ac ? (
          <Fact label={t("route.ac")}>
            {formatMoneyRange(bus.ac.min, bus.ac.max, locale)}
            <span className="block text-xs font-normal text-muted">
              {t("common.asOf", { date: formatDate(bus.ac.asOf, locale) })}
            </span>
          </Fact>
        ) : null}
      </dl>
      {chart && (chart.seat40 || chart.seat51 || chart.flat) ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-h3">{t("route.chartTitle")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-left">
              <caption className="sr-only">{t("route.chartTitle")}</caption>
              <tbody>
                {(
                  [
                    ["route.chartSeat40", chart.seat40],
                    ["route.chartSeat51", chart.seat51],
                    ["route.chartFlat", chart.flat],
                  ] as const
                ).map(([key, fare]) =>
                  fare ? (
                    <tr key={key} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2 pr-4 font-medium">
                        {t(key)}
                      </th>
                      <td className="num py-2 text-right font-semibold">
                        {formatMoney(fare, locale)}
                      </td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted">
            {t("route.chartNote", {
              from: chart.from,
              km: formatDistance(chart.km, locale),
              date: formatDate(chart.asOf, locale),
            })}
          </p>
        </div>
      ) : null}
      {bus.operators.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-h3">{t("route.operators")}</h3>
          <ul className="flex flex-wrap gap-2">
            {bus.operators.map((o) => (
              <li
                key={o.name}
                className="inline-flex items-center gap-2 rounded-pill bg-surface-2 px-3 py-1.5 text-sm font-semibold"
              >
                {o.name}
                {o.ac ? (
                  <StatusTag tone={o.ac === "non" ? "neutral" : "info"}>{acLabel[o.ac]}</StatusTag>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Provenance
        locale={locale}
        asOf={bus.asOf}
        confidence={bus.confidence}
        sources={bus.sources}
      />
    </Block>
  );
}

function TrainsBlock({
  out,
  back,
  route,
  t,
  locale,
}: {
  out: TrainSummary[];
  back: TrainSummary[];
  route: Pick<ComputedRoute, "from" | "to">;
  t: Tr;
  locale: Locale;
}) {
  const sections = [
    {
      key: "out",
      title: t("route.trainsOut", { from: route.from.name, to: route.to.name }),
      list: out,
    },
    {
      key: "back",
      title: t("route.trainsBack", { from: route.to.name, to: route.from.name }),
      list: back,
    },
  ];
  const shown = [...out, ...back];
  const rank = { low: 0, medium: 1, high: 2 } as const;
  const confidence = shown.length
    ? shown.reduce(
        (m, x) => (rank[x.confidence] < rank[m] ? x.confidence : m),
        "high" as Confidence,
      )
    : null;
  const asOf =
    shown
      .map((x) => x.asOf)
      .sort()
      .at(-1) ?? null;
  const sources = shown.flatMap((x) => x.sources);
  return (
    <Block id="trains" icon="train" title={t("route.trainsTitle")}>
      {out.length || back.length ? (
        <>
          {sections.map((s) =>
            s.list.length ? (
              <div key={s.key} className="flex flex-col gap-2">
                <h3 className="text-h3">{s.title}</h3>
                <ul className="flex flex-col gap-3">
                  {s.list.map((tr) => (
                    <li key={tr.slug} className="flex">
                      <TrainRow train={tr} className="w-full" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          <Provenance locale={locale} asOf={asOf} confidence={confidence} sources={sources} />
        </>
      ) : (
        <p className="text-muted">{t("route.trainsNone")}</p>
      )}
    </Block>
  );
}

function LaunchBlock({ water, t, locale }: { water: RouteWater[]; t: Tr; locale: Locale }) {
  const status = (s: string) =>
    s === "daily"
      ? t("route.launchDaily")
      : s === "irregular"
        ? t("route.launchIrregular")
        : s === "festival_only"
          ? t("route.launchFestival")
          : s;
  return (
    <Block id="launch" icon="launch" title={t("route.launchTitle")}>
      <ul className="flex flex-col gap-5">
        {water.map((w, i) => (
          <li key={`${w.from}-${i}`} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-h3">
                {w.from} <span aria-hidden>→</span>
                <span className="sr-only">–</span> {w.to}
              </h3>
              <StatusTag tone={w.status === "daily" ? "good" : "neutral"}>
                {status(w.status)}
              </StatusTag>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {w.hours ? (
                <Fact label={t("route.launchTime")}>
                  {formatHoursRange(w.hours[0], w.hours[1], locale)}
                </Fact>
              ) : null}
              {w.km ? (
                <Fact label={t("route.launchDistance")}>{formatDistance(w.km, locale)}</Fact>
              ) : null}
              {w.departs ? <Fact label={t("route.launchDeparts")}>{w.departs}</Fact> : null}
              {w.deck ? (
                <Fact label={t("route.deck")}>
                  {formatMoneyRange(w.deck[0], w.deck[1], locale)}
                </Fact>
              ) : null}
              {w.single ? (
                <Fact label={t("route.cabinSingle")}>
                  {formatMoneyRange(w.single[0], w.single[1], locale)}
                </Fact>
              ) : null}
              {w.double ? (
                <Fact label={t("route.cabinDouble")}>
                  {formatMoneyRange(w.double[0], w.double[1], locale)}
                </Fact>
              ) : null}
              {w.vessels.length ? (
                <Fact label={t("route.vessels")}>{w.vessels.join(", ")}</Fact>
              ) : null}
            </dl>
            <Provenance
              locale={locale}
              asOf={w.asOf}
              confidence={w.confidence}
              sources={w.sources}
            />
          </li>
        ))}
      </ul>
    </Block>
  );
}

function FlightBlock({ flight, t, locale }: { flight: RouteFlight; t: Tr; locale: Locale }) {
  const per = flight.perDay;
  const frequency =
    per === null
      ? flight.perWeek
        ? t("route.perWeek", { count: flight.perWeek })
        : null
      : Array.isArray(per)
        ? per[0] === per[1]
          ? t("route.perDay", { count: per[0] })
          : t("route.perDayRange", {
              min: formatNumber(per[0], locale),
              max: formatNumber(per[1], locale),
            })
        : t("route.perDay", { count: per });
  return (
    <Block id="flight" icon="plane" title={t("route.flightTitle")}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact label={t("route.airports")}>
          {flight.fromAirport.name} ({flight.fromAirport.code}) <span aria-hidden>→</span>
          <span className="sr-only">–</span> {flight.airport.name} ({flight.airport.code})
        </Fact>
        <Fact label={t("route.flightTime")}>{formatMinutes(flight.minutes, locale)}</Fact>
        {flight.airlines.length ? (
          <Fact label={t("route.airlines")}>{flight.airlines.join(", ")}</Fact>
        ) : null}
        {frequency ? <Fact label={t("route.frequency")}>{frequency}</Fact> : null}
        {flight.onwardKm ? (
          <Fact label={t("route.onward")}>{formatDistance(flight.onwardKm, locale)}</Fact>
        ) : null}
      </dl>
      <Provenance locale={locale} asOf={flight.asOf} sources={flight.sources} />
    </Block>
  );
}

function BookingBlock({ links, t }: { links: BookingLinks; t: Tr }) {
  const items = [
    { name: t("route.bookTrain"), url: links.train, icon: "train" as const },
    {
      name: t("route.bookBus", { name: links.bus.name }),
      url: links.bus.url,
      icon: "bus" as const,
    },
    ...links.air.map((a) => ({ name: a.name, url: a.url, icon: "plane" as const })),
  ];
  return (
    <PageSection id="booking" title={t("route.bookTitle")}>
      <p className="max-w-[68ch] text-muted">{t("route.bookIntro")}</p>
      <ul className="flex flex-wrap gap-3">
        {items.map((i) => (
          <li key={i.url}>
            <ButtonLink
              href={i.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              icon={i.icon}
            >
              {i.name}
            </ButtonLink>
          </li>
        ))}
      </ul>
    </PageSection>
  );
}

export default async function RoutePage({ params }: PageProps) {
  const { lang: param, slug } = await params;
  if (!isLocale(param)) notFound();
  const locale: Locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const { route, computed } = await load(slug, lang);
  const r = route ?? computed;
  if (!r) notFound();
  const booking = await getBookingLinks();

  const title = t("route.title", { from: r.from.name, to: r.to.name });
  const url = `${SITE_URL}${localePath(locale, `/route/${r.slug}`)}`;
  const reverseHref = route?.reverseSlug
    ? localePath(locale, `/route/${route.reverseSlug}`)
    : localePath(locale, `/route/${r.to.slug}-to-${r.from.slug}`);

  const busHours = route ? (route.bus?.hours ?? null) : computed!.busHours;
  const busFrom = route
    ? (route.bus?.nonAc?.min ?? route.bus?.ac?.min ?? route.bus?.chart?.seat51 ?? null)
    : computed!.busFareFromBdt;
  const directTrains = r.trains.length;
  const dash = "–";

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("nav.routes"), href: localePath(locale, "/routes") },
    { label: `${r.from.name} → ${r.to.name}` },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.href ? `${SITE_URL}${c.href}` : url,
    })),
  };

  return (
    <PageContainer className="gap-8">
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-balance">{title}</h1>
        {computed ? (
          <p className="max-w-[68ch] text-lg text-muted">
            {computed.estimated ? t("route.computedNote") : t("route.dhakaNote")}
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={computed?.estimated ? t("route.tileRoadEstimate") : t("route.tileRoad")}
          value={formatDistance(r.roadKm, locale)}
        />
        <StatTile
          label={t("route.tileBus")}
          value={busHours ? formatHoursRange(busHours[0], busHours[1], locale) : dash}
        />
        <StatTile
          label={t("route.tileFare")}
          value={busFrom ? formatMoney(busFrom, locale) : dash}
          money
        />
        <StatTile label={t("route.tileTrains")} value={formatNumber(directTrains, locale)} />
      </div>

      {route ? <BusBlock route={route} t={t} locale={locale} /> : null}
      <TrainsBlock out={r.trains} back={r.trainsBack} route={r} t={t} locale={locale} />
      {route ? (
        route.water.length ? (
          <LaunchBlock water={route.water} t={t} locale={locale} />
        ) : (
          <Block id="launch" icon="launch" title={t("route.launchTitle")}>
            <p className="text-muted">{t("route.launchNone")}</p>
          </Block>
        )
      ) : null}
      {route ? (
        route.flight ? (
          <FlightBlock flight={route.flight} t={t} locale={locale} />
        ) : (
          <Block id="flight" icon="plane" title={t("route.flightTitle")}>
            <p className="text-muted">{t("route.flightNone")}</p>
          </Block>
        )
      ) : null}

      <PageSection id="places" title={t("route.placesTitle", { name: r.to.name })}>
        {r.placesAtDestination.length ? (
          <CardGrid max={4}>
            {r.placesAtDestination.map((p, i) => (
              <PlaceCard key={p.slug} place={p} priority={i < 4} headingLevel={3} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState body={t("district.placesEmpty")} />
        )}
        <TextLink href={localePath(locale, `/district/${r.to.slug}`)} trailingIcon="arrow-right">
          {t("route.districtLink", { name: r.to.name })}
        </TextLink>
      </PageSection>

      <BookingBlock links={booking} t={t} />

      <p>
        <TextLink href={reverseHref} trailingIcon="arrow-right">
          {t("route.reverse", { from: r.to.name, to: r.from.name })}
        </TextLink>
      </p>
    </PageContainer>
  );
}
