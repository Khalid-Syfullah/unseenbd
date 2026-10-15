import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader, PageSection } from "@/components/discovery/PageHeader";
import { OwnerListingGrid } from "@/components/listings/OwnerListingGrid";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { MessageKey } from "@/i18n/translate";
import type { DirectorySection } from "@/lib/directory";
import type { DirectoryPage } from "@/lib/listings/rules";
import { alternatesFor } from "@/lib/seo";
import { listDirectory, listPageListings } from "@/server/data/listings";
import { DirectoryBrowser, type DirectoryGroup } from "./DirectoryBrowser";

const SECTIONS: Record<DirectoryPage, DirectorySection[]> = {
  stay: ["hotels", "resorts"],
  restaurants: ["restaurants"],
  shopping: ["shopping"],
};

const SECTION_TITLE: Record<DirectorySection, MessageKey> = {
  hotels: "directory.section.hotels",
  resorts: "directory.section.resorts",
  restaurants: "directory.section.restaurants",
  shopping: "directory.section.malls",
};

const EXTRA_TITLE: Partial<Record<DirectoryPage, MessageKey>> = {
  restaurants: "directory.foodTitle",
  shopping: "directory.productsTitle",
};

export async function directoryMetadata(
  params: Promise<{ lang: string }>,
  page: DirectoryPage,
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t(`directory.${page}.title` as MessageKey),
    description: t(`directory.${page}.intro` as MessageKey),
    alternates: alternatesFor(lang, `/${page}`),
  };
}

/** `/stay`, `/restaurants`, `/shopping`: the seeded directory plus approved owner listings. */
export async function renderDirectoryPage({
  params,
  page,
}: {
  params: Promise<{ lang: string }>;
  page: DirectoryPage;
}) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const t = getT(param);
  const lang = contentLocale(param);

  const groups: DirectoryGroup[] = await Promise.all(
    SECTIONS[page].map(async (section) => ({
      id: section,
      title: t(SECTION_TITLE[section]),
      items: await listDirectory(section, lang),
    })),
  );
  const { businesses, extra } = await listPageListings(page, lang);
  const addHref = localePath(param, "/add-listing?kind=business");
  const extraTitle = EXTRA_TITLE[page];
  const extraKind = page === "restaurants" ? "food" : "product";

  return (
    <PageContainer>
      <PageHeader
        title={t(`directory.${page}.title` as MessageKey)}
        intro={t(`directory.${page}.intro` as MessageKey)}
      />
      <DirectoryBrowser groups={groups} />

      <PageSection id="owners" title={t("directory.ownersTitle")}>
        {businesses.length ? (
          <OwnerListingGrid items={businesses} />
        ) : (
          <EmptyState illustration={null} body={t("directory.ownersEmpty")} />
        )}
      </PageSection>

      {extraTitle ? (
        <PageSection id="extra" title={t(extraTitle)}>
          {extra.length ? (
            <OwnerListingGrid items={extra} />
          ) : (
            <EmptyState illustration={null} body={t("directory.ownersEmpty")} />
          )}
          <div>
            <ButtonLink
              href={localePath(param, `/add-listing?kind=${extraKind}`)}
              variant="secondary"
              icon="plus"
            >
              {t(extraKind === "food" ? "home.owner.food" : "home.owner.product")}
            </ButtonLink>
          </div>
        </PageSection>
      ) : null}

      <aside className="flex flex-col items-start gap-3 rounded-lg border border-border bg-primary-wash p-5">
        <p className="font-semibold">{t("directory.ownerCta")}</p>
        <ButtonLink href={addHref} icon="plus">
          {t("nav.addListing")}
        </ButtonLink>
      </aside>
      <p className="text-sm text-muted">{t("directory.snapshotNote")}</p>
    </PageContainer>
  );
}
