import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { JsonLd } from "@/components/home/JsonLd";
import { ShareLocation } from "@/components/info/ShareLocation";
import { Breadcrumb } from "@/components/place/Breadcrumb";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { MessageKey } from "@/i18n/translate";
import { localizeDigits } from "@/lib/format";
import { alternatesFor, ogImages } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { listEmergencyNumbers } from "@/server/data";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("safety.metaTitle"),
    description: t("safety.metaDescription"),
    alternates: alternatesFor(lang, "/safety"),
    openGraph: {
      images: ogImages(lang),
      title: t("safety.metaTitle"),
      description: t("safety.metaDescription"),
      url: localePath(lang, "/safety"),
    },
  };
}

const TIPS: { key: MessageKey; icon: IconName }[] = [
  { key: "safety.tipHills", icon: "flag" },
  { key: "safety.tipSea", icon: "flag" },
  { key: "safety.tipTrails", icon: "explore" },
  { key: "safety.tipId", icon: "passport" },
  { key: "safety.tipPhoto", icon: "camera" },
  { key: "safety.tipLife", icon: "shield" },
  { key: "safety.tipRubbish", icon: "check" },
];

const GROUPS: { id: string; title: MessageKey; items: MessageKey[] }[] = [
  {
    id: "always",
    title: "safety.packAlways",
    items: [1, 2, 3, 4, 5, 6].map((i) => `safety.pack_always_${i}` as MessageKey),
  },
  {
    id: "monsoon",
    title: "safety.packMonsoon",
    items: [1, 2, 3, 4, 5, 6].map((i) => `safety.pack_monsoon_${i}` as MessageKey),
  },
  {
    id: "winter",
    title: "safety.packWinter",
    items: [1, 2, 3, 4, 5].map((i) => `safety.pack_winter_${i}` as MessageKey),
  },
  {
    id: "hills",
    title: "safety.packHills",
    items: [1, 2, 3, 4, 5, 6].map((i) => `safety.pack_hills_${i}` as MessageKey),
  },
  {
    id: "sea",
    title: "safety.packSea",
    items: [1, 2, 3, 4, 5, 6].map((i) => `safety.pack_sea_${i}` as MessageKey),
  },
];

/** `/safety` (FEATURES.md §4.7): emergency numbers, share my location, tips, packing lists. */
export default async function SafetyPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale = param;
  const t = getT(locale);
  const numbers = await listEmergencyNumbers();
  const describe = (n: string) => {
    const key = `safety.n${n}` as MessageKey;
    return t(key);
  };

  const crumbs = [
    { label: t("nav.home"), href: localePath(locale, "/") },
    { label: t("nav.safety") },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href ?? localePath(locale, "/safety")}`,
    })),
  };

  return (
    <PageContainer>
      <JsonLd data={jsonLd} />
      <Breadcrumb items={crumbs} label={t("place.breadcrumb")} />
      <PageHeader title={t("safety.title")} intro={t("safety.intro")} />

      <PageSection id="emergency" title={t("safety.callTitle")}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {numbers.map((n) => (
            <li key={n.number}>
              <a
                href={`tel:${n.number}`}
                aria-label={`${t("safety.callLabel", { number: n.number })}. ${describe(n.number)}`}
                className="flex h-full flex-col gap-2 rounded-lg border border-border bg-raised p-4 shadow-1 transition-colors duration-[var(--dur-1)] ease-standard hover:bg-primary-wash"
              >
                <span className="inline-flex items-center gap-2 text-primary">
                  <Icon name="phone" size={20} />
                  <span className="num font-display text-4xl leading-none">
                    {localizeDigits(n.number, contentLocale(locale))}
                  </span>
                </span>
                <span className="text-muted">{describe(n.number)}</span>
              </a>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection id="location" title={t("safety.locTitle")}>
        <p className="max-w-[68ch] text-muted">{t("safety.locIntro")}</p>
        <ShareLocation />
      </PageSection>

      <PageSection id="tips" title={t("safety.tipsTitle")}>
        <ul className="grid gap-3 md:grid-cols-2">
          {TIPS.map((tip) => (
            <li
              key={tip.key}
              className="flex items-start gap-3 rounded-lg border border-border bg-raised p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-wash text-primary">
                <Icon name={tip.icon} size={20} />
              </span>
              <p>{t(tip.key)}</p>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection id="packing" title={t("safety.packTitle")}>
        <p className="max-w-[68ch] text-muted">{t("safety.packIntro")}</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <fieldset
              key={group.id}
              className="flex flex-col gap-1 rounded-lg border border-border bg-raised p-4"
            >
              <legend className="px-1 text-h3">{t(group.title)}</legend>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input type="checkbox" className="size-5 shrink-0 accent-primary" />
                      <span>{t(item)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
      </PageSection>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={localePath(locale, "/plan")} icon="planner">
          {t("nav.planner")}
        </ButtonLink>
        <ButtonLink href={localePath(locale, "/explore")} variant="secondary" icon="explore">
          {t("nav.explore")}
        </ButtonLink>
      </div>
    </PageContainer>
  );
}
