import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { ButtonLink } from "@/components/ui/Button";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { MessageKey } from "@/i18n/translate";
import { localizeDigits } from "@/lib/format";
import { alternatesFor, ogImages } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { listForeignTour } from "@/server/data";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("foreignTour.title"),
    description: t("foreignTour.metaDescription"),
    alternates: alternatesFor(lang, "/foreign-tour"),
    openGraph: {
      images: ogImages(lang),
      title: t("foreignTour.title"),
      description: t("foreignTour.metaDescription"),
      url: localePath(lang, "/foreign-tour"),
    },
  };
}

/** Bengali names of the cities in the guide (the other languages use the English names). */
const CITY_BN: Record<string, string> = {
  Kolkata: "কলকাতা",
  Delhi: "দিল্লি",
  Darjeeling: "দার্জিলিং",
  Kashmir: "কাশ্মীর",
  Kathmandu: "কাঠমান্ডু",
  Pokhara: "পোখরা",
  Colombo: "কলম্বো",
  Kandy: "ক্যান্ডি",
  Galle: "গল",
  Bangkok: "ব্যাংকক",
  "Chiang Mai": "চিয়াং মাই",
  Phuket: "ফুকেট",
  "Kuala Lumpur": "কুয়ালালামপুর",
  Penang: "পেনাং",
  Langkawi: "লংকাউই",
  "Marina Bay": "মেরিনা বে",
  Sentosa: "সেন্টোসা",
  Hanoi: "হ্যানয়",
  "Da Nang": "দা নাং",
  "Ho Chi Minh City": "হো চি মিন সিটি",
  Beijing: "বেইজিং",
  Shanghai: "সাংহাই",
  Guangzhou: "গুয়াংজু",
  Seoul: "সিউল",
  Busan: "বুসান",
  Jeju: "জেজু",
  Tokyo: "টোকিও",
  Kyoto: "কিয়োটো",
  Osaka: "ওসাকা",
  Dubai: "দুবাই",
  "Abu Dhabi": "আবু ধাবি",
  London: "লন্ডন",
  Edinburgh: "এডিনবরা",
  Zurich: "জুরিখ",
  Geneva: "জেনেভা",
  Lucerne: "লুজার্ন",
};

const REGION_KEY: Record<string, MessageKey> = {
  "South Asia": "foreignTour.region_south_asia",
  "South-East Asia": "foreignTour.region_south_east_asia",
  "East Asia": "foreignTour.region_east_asia",
  "Middle East": "foreignTour.region_middle_east",
  Europe: "foreignTour.region_europe",
};

/** `/foreign-tour` (FEATURES.md §4.8): 13 countries popular from Bangladesh. */
export default async function ForeignTourPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const lang = contentLocale(locale);
  const t = getT(locale);
  const countries = await listForeignTour();

  let countryName: (c: { country: string; countryBn: string }) => string;
  if (locale === "bn") countryName = (c) => c.countryBn || c.country;
  else {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    const code: Record<string, string> = {
      India: "IN",
      Nepal: "NP",
      "Sri Lanka": "LK",
      Thailand: "TH",
      Malaysia: "MY",
      Singapore: "SG",
      Vietnam: "VN",
      China: "CN",
      "South Korea": "KR",
      Japan: "JP",
      "United Arab Emirates": "AE",
      "United Kingdom": "GB",
      Switzerland: "CH",
    };
    countryName = (c) => (code[c.country] ? (names.of(code[c.country]!) ?? c.country) : c.country);
  }

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("nav.foreignTour") },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href ?? localePath(locale, "/foreign-tour")}`,
    })),
  };

  return (
    <PageContainer>
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <PageHeader title={t("foreignTour.title")} intro={t("foreignTour.intro")} />

      <PageSection id="countries" title={t("foreignTour.cities")}>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((c) => (
            <li
              key={c.no}
              className="flex gap-4 rounded-lg border border-border bg-raised p-4 shadow-1"
            >
              <span
                aria-hidden
                className="num flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-on-primary"
              >
                {localizeDigits(c.no, lang)}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm text-muted">
                  {REGION_KEY[c.region] ? t(REGION_KEY[c.region]!) : c.region}
                </p>
                <h3 className="text-h3">{countryName(c)}</h3>
                <p className="text-muted">
                  {c.cities
                    .map((city) => (locale === "bn" ? (CITY_BN[city] ?? city) : city))
                    .join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </PageSection>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-5">
        <h2 className="text-h3">{t("foreignTour.worldTitle")}</h2>
        <p className="max-w-[68ch] text-muted">{t("foreignTour.worldBody")}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={localePath(locale, "/world")} icon="world">
            {t("foreignTour.worldLink")}
          </ButtonLink>
          <ButtonLink href={localePath(locale, "/plan")} variant="secondary" icon="planner">
            {t("foreignTour.planLink")}
          </ButtonLink>
        </div>
      </section>
    </PageContainer>
  );
}
