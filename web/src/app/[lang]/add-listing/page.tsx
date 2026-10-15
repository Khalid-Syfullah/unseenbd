import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddListingForm } from "@/components/listings/AddListingForm";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { contentLocale, isLocale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { isListingKind } from "@/lib/listings/rules";
import { firstParam, type SearchParams } from "@/lib/params";
import { alternatesFor } from "@/lib/seo";
import { listDistrictsByDivision } from "@/server/data";
import { getListing, listingTiers } from "@/server/data/listings";
import { currentSession } from "@/server/auth/current";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("addListing.metaTitle"),
    description: t("addListing.metaDescription"),
    alternates: alternatesFor(lang, "/add-listing"),
    robots: { index: true },
  };
}

/** `/add-listing?kind=business|food|product` (FEATURES.md §7.5); `?edit=ID` edits your own. */
export default async function AddListingPage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const t = getT(param);
  const lang = contentLocale(param);
  const query = await searchParams;
  const kind = firstParam(query.kind);

  let editing = undefined;
  const editId = firstParam(query.edit);
  if (editId) {
    const session = await currentSession();
    if (!session || !/^\d{1,12}$/.test(editId)) notFound();
    const listing = await getListing(Number(editId), lang, { id: session.user.id, admin: false });
    if (!listing || listing.ownerId !== session.user.id) notFound();
    editing = listing;
  }

  const groups = await listDistrictsByDivision(lang);
  return (
    <PageContainer className="max-w-[880px]">
      <PageHeader
        title={editing ? t("addListing.editTitle") : t("addListing.title")}
        intro={t("addListing.intro")}
      />
      <AddListingForm
        divisions={groups.map((g) => ({
          slug: g.slug,
          name: g.name,
          districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
        }))}
        tiers={listingTiers()}
        initialKind={isListingKind(kind) ? kind : "business"}
        editing={editing}
      />
    </PageContainer>
  );
}
