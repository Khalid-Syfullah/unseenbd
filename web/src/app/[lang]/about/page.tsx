import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { MessageKey } from "@/i18n/translate";
import { alternatesFor, ogImages } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("about.title"),
    description: t("about.metaDescription"),
    alternates: alternatesFor(lang, "/about"),
    openGraph: {
      images: ogImages(lang),
      title: t("about.title"),
      description: t("about.metaDescription"),
      url: localePath(lang, "/about"),
    },
  };
}

const CREDITS: MessageKey[] = [
  "about.creditPhotos",
  "about.creditBoundaries",
  "about.creditWorld",
  "about.creditFonts",
  "about.creditArt",
];
const PRIVACY: MessageKey[] = [
  "about.pvBrowser",
  "about.pvVisits",
  "about.pvDevice",
  "about.pvAccount",
  "about.pvUploads",
  "about.pvLocation",
  "about.pvOffline",
  "about.pvDelete",
];
const TERMS: MessageKey[] = [
  "about.tm1",
  "about.tm2",
  "about.tm3",
  "about.tm4",
  "about.tm5",
  "about.tm6",
];

function Bullets({ items, t }: { items: MessageKey[]; t: ReturnType<typeof getT> }) {
  return (
    <ul className="flex max-w-[68ch] list-disc flex-col gap-2 pl-5 text-lg">
      {items.map((key) => (
        <li key={key}>{t(key)}</li>
      ))}
    </ul>
  );
}

/** `/about` (FEATURES.md §1.9): what this is, data checks, credits, privacy and terms. */
export default async function AboutPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("nav.about") },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href ?? localePath(locale, "/about")}`,
    })),
  };

  return (
    <PageContainer>
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <PageHeader title={t("about.title")} intro={t("about.intro")} />

      <PageSection id="what" title={t("about.whatTitle")}>
        <p className="max-w-[68ch] text-lg">{t("about.whatBody1")}</p>
        <p className="max-w-[68ch] text-lg">{t("about.whatBody2")}</p>
      </PageSection>

      <PageSection id="verified" title={t("about.verifyTitle")}>
        <p className="max-w-[68ch] text-lg">{t("about.verifyBody1")}</p>
        <p className="max-w-[68ch] text-lg">{t("about.verifyBody2")}</p>
        <p>
          <Link
            href={localePath(locale, "/suggest")}
            className="text-primary underline underline-offset-2"
          >
            {t("about.verifyLink")}
          </Link>
        </p>
      </PageSection>

      <PageSection id="credits" title={t("about.creditsTitle")}>
        <Bullets items={CREDITS} t={t} />
      </PageSection>

      <PageSection id="privacy" title={t("about.privacyTitle")}>
        <p className="max-w-[68ch] text-lg text-muted">{t("about.privacyIntro")}</p>
        <Bullets items={PRIVACY} t={t} />
      </PageSection>

      <PageSection id="terms" title={t("about.termsTitle")}>
        <Bullets items={TERMS} t={t} />
      </PageSection>
    </PageContainer>
  );
}
