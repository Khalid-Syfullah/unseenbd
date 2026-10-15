import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer, PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { Provenance } from "@/components/routes/Provenance";
import { ButtonLink } from "@/components/ui/Button";
import { CARD } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/Chip";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import {
  formatMinutes,
  formatMoney,
  formatTime,
  formatTimeRange,
  localizeDigits,
  weekdayName,
} from "@/lib/format";
import { alternatesFor, ogImages } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { getBookingLinks, getTrain, listTrains } from "@/server/data";
import type { TrainFare } from "@/server/data/types";
import type { TrainClass } from "@/server/db/json-types";

type PageProps = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const all = await listTrains("en");
  return (["bn", "en"] as const).flatMap((lang) => all.map((tr) => ({ lang, slug: tr.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const train = await getTrain(slug, contentLocale(lang));
  if (!train) return {};
  const t = getT(lang);
  const title = t("train.title", { name: train.name, no: localizeDigits(train.no, lang) });
  const description = t("train.metaDescription", {
    name: train.name,
    from: train.from.station,
    to: train.to.station,
    dep: formatTime(train.dep, lang),
    arr: formatTime(train.arr, lang),
  });
  return {
    title,
    description,
    alternates: alternatesFor(lang, `/train/${train.slug}`),
    openGraph: {
      images: ogImages(lang),
      title,
      description,
      url: localePath(lang, `/train/${train.slug}`),
    },
  };
}

/** Fares as a matrix: one row per segment, one column per class. */
function fareMatrix(fares: TrainFare[], classes: TrainClass[]) {
  const rows = new Map<string, { from: string; to: string; byClass: Map<string, number> }>();
  for (const f of fares) {
    const key = `${f.from}→${f.to}`;
    const row = rows.get(key) ?? { from: f.from, to: f.to, byClass: new Map() };
    row.byClass.set(f.cls, f.fare);
    rows.set(key, row);
  }
  return { classes, rows: [...rows.values()] };
}

export default async function TrainPage({ params }: PageProps) {
  const { lang: param, slug } = await params;
  if (!isLocale(param)) notFound();
  const locale: Locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);

  const [train, booking] = await Promise.all([getTrain(slug, lang), getBookingLinks()]);
  if (!train) notFound();

  const title = t("train.title", { name: train.name, no: localizeDigits(train.no, lang) });
  const url = `${SITE_URL}${localePath(locale, `/train/${train.slug}`)}`;
  const classOrder = train.classes.length
    ? train.classes
    : [...new Set(train.fares.map((f) => f.cls))];
  const matrix = fareMatrix(train.fares, classOrder);

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("nav.trains"), href: localePath(locale, "/trains") },
    { label: train.name },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TrainTrip",
        name: title,
        trainName: train.name,
        trainNumber: String(train.no),
        departureStation: { "@type": "TrainStation", name: train.from.station },
        arrivalStation: { "@type": "TrainStation", name: train.to.station },
        departureTime: train.dep,
        arrivalTime: train.arr,
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.label,
          item: c.href ? `${SITE_URL}${c.href}` : url,
        })),
      },
    ],
  };

  return (
    <PageContainer className="gap-8">
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1 text-balance">{title}</h1>
        <p className="text-lg text-muted">
          {train.from.station} <span aria-hidden>→</span>
          <span className="sr-only">–</span> {train.to.station}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="num font-display text-display">
            {formatTimeRange(train.dep, train.arr, lang)}
          </p>
          <span className="num text-muted">{formatMinutes(train.minutes, lang)}</span>
          <StatusTag tone={train.offDay === null ? "good" : "neutral"}>
            {train.offDay === null
              ? t("ui.everyDay")
              : t("ui.offDay", { day: weekdayName(train.offDay, lang) })}
          </StatusTag>
        </div>
        <div className="flex flex-wrap gap-3">
          {train.returnTrain ? (
            <ButtonLink
              href={localePath(locale, `/train/${train.returnTrain.slug}`)}
              variant="secondary"
              trailingIcon="arrow-right"
            >
              {t("train.returnLink", { name: train.returnTrain.name })}
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={booking.train}
            target="_blank"
            rel="noopener noreferrer"
            icon="external"
          >
            {t("train.eticket")}
          </ButtonLink>
        </div>
      </header>

      <PageSection id="stops" title={t("train.stopsTitle")}>
        <div className={`${CARD} p-4 md:p-6`}>
          <ol className="flex flex-col">
            {train.stops.map((s, i) => {
              const first = i === 0;
              const last = i === train.stops.length - 1;
              return (
                <li key={s.position} className="relative flex gap-4 pb-6 last:pb-0">
                  {last ? null : (
                    <span
                      aria-hidden
                      className="absolute top-4 bottom-0 left-[7px] w-0.5 bg-border-strong"
                    />
                  )}
                  <span
                    aria-hidden
                    className={`relative z-10 mt-1.5 size-4 shrink-0 rounded-full border-2 border-primary ${
                      first || last ? "bg-primary" : "bg-raised"
                    }`}
                  />
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {s.district ? (
                          <Link
                            href={localePath(locale, `/district/${s.district.slug}`)}
                            className="hover:text-primary hover:underline"
                          >
                            {s.station}
                          </Link>
                        ) : (
                          s.station
                        )}
                      </p>
                      {s.minutes !== null && s.minutes > 0 ? (
                        <p className="num text-sm text-muted">
                          {t("train.elapsed", { time: formatMinutes(s.minutes, lang) })}
                        </p>
                      ) : null}
                    </div>
                    <dl className="num flex gap-5 text-right">
                      {s.arr ? (
                        <div>
                          <dt className="text-xs text-muted">{t("train.arrives")}</dt>
                          <dd className="font-semibold">{formatTime(s.arr, lang)}</dd>
                        </div>
                      ) : null}
                      {s.dep ? (
                        <div>
                          <dt className="text-xs text-muted">{t("train.departs")}</dt>
                          <dd className="font-semibold">{formatTime(s.dep, lang)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </PageSection>

      <PageSection id="fares" title={t("train.faresTitle")}>
        <div className={`${CARD} gap-4 p-4 md:p-6`}>
          {matrix.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <caption className="sr-only">{t("train.faresTitle")}</caption>
                <thead>
                  <tr className="border-b border-border-strong text-sm text-muted">
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      {t("train.segment")}
                    </th>
                    {matrix.classes.map((c) => (
                      <th key={c} scope="col" className="px-2 py-2 text-right font-semibold">
                        {t(`train.class.${c}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((r) => (
                    <tr key={`${r.from}-${r.to}`} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2.5 pr-4 font-medium">
                        {r.from} <span aria-hidden>→</span>
                        <span className="sr-only">–</span> {r.to}
                      </th>
                      {matrix.classes.map((c) => {
                        const fare = r.byClass.get(c);
                        return (
                          <td key={c} className="num px-2 py-2.5 text-right">
                            {fare === undefined ? (
                              <span aria-label={t("train.noFare")}>–</span>
                            ) : (
                              formatMoney(fare, lang)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">{t("train.noFares")}</p>
          )}
          {train.timetable ? (
            <p className="text-sm">
              <span className="font-semibold">{t("train.timetable")}:</span> {train.timetable}
            </p>
          ) : null}
          <Provenance
            locale={locale}
            asOf={train.asOf}
            confidence={train.confidence}
            sources={train.sources}
          />
        </div>
      </PageSection>
    </PageContainer>
  );
}
