import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer, PageSection } from "@/components/discovery/PageHeader";
import { ListingContact } from "@/components/listings/ListingContact";
import { ListingReviews } from "@/components/listings/ListingReviews";
import { StatusTag } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { MessageKey } from "@/i18n/translate";
import { formatMoney, formatNumber } from "@/lib/format";
import { alternatesFor } from "@/lib/seo";
import { currentSession } from "@/server/auth/current";
import { getListing } from "@/server/data/listings";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string; id: string }> };

async function load(params: PageProps["params"]) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !/^\d{1,12}$/.test(id)) return null;
  const session = await currentSession();
  const viewer = session ? { id: session.user.id, admin: session.user.role === "admin" } : null;
  const listing = await getListing(Number(id), contentLocale(lang), viewer);
  return listing ? { lang, listing } : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { lang, listing } = found;
  return {
    title: `${listing.name}${listing.area ? `, ${listing.area}` : ""}`,
    description: listing.description?.slice(0, 160),
    alternates: alternatesFor(lang, `/listing/${listing.id}`),
    robots: listing.status === "approved" ? undefined : { index: false },
  };
}

/** `/listing/:id`: an owner listing with photos, prices, contact buttons and reviews. */
export default async function ListingPage({ params }: PageProps) {
  const found = await load(params);
  if (!found) notFound();
  const { lang: locale, listing } = found;
  const t = getT(locale);
  const lang = contentLocale(locale);
  const category = t(
    (listing.kind === "business" && listing.category
      ? `listings.category.${listing.category}`
      : `listings.kind.${listing.kind}`) as MessageKey,
  );

  return (
    <PageContainer className="max-w-[960px]">
      {listing.status !== "approved" ? (
        <p role="status" className="rounded-md bg-surface-2 px-4 py-3 text-sm">
          {t(`myListings.note.${listing.status}` as MessageKey)}
        </p>
      ) : null}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {listing.sponsored ? (
            <StatusTag tone="sponsored">{t("common.sponsored")}</StatusTag>
          ) : null}
          <StatusTag tone="neutral">{category}</StatusTag>
          {listing.rating ? (
            <span className="num inline-flex items-center gap-1 text-sm font-semibold">
              <Icon name="star" size={16} className="text-accent" />
              {formatNumber(listing.rating, lang)}
              <span className="font-normal text-muted">
                ({t("ui.reviews", { count: listing.reviews })})
              </span>
            </span>
          ) : null}
        </div>
        <h1 className="text-h1 text-balance">{listing.name}</h1>
        <p className="inline-flex items-center gap-1 text-lg text-muted">
          <Icon name="pin" size={18} />
          {[listing.area, listing.district.name].filter(Boolean).join(", ")}
        </p>
      </header>

      {listing.photos.length ? (
        <ul aria-label={t("listing.photos")} className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {listing.photos.map((p, i) => (
            <li
              key={p.src}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-2 ${i === 0 ? "col-span-2 row-span-2 md:aspect-auto" : ""}`}
            >
              <Image
                src={i === 0 ? p.src : (p.thumb ?? p.src)}
                alt={`${listing.name} ${i + 1}`}
                fill
                unoptimized
                sizes="(min-width: 768px) 33vw, 50vw"
                className="object-cover"
                priority={i === 0}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {listing.description ? (
        <p className="max-w-[68ch] text-lg whitespace-pre-line">{listing.description}</p>
      ) : null}

      <PageSection id="contact" title={t("listing.contact")}>
        {listing.contactName ? (
          <p className="text-muted">
            {t("listing.contactPerson")}: <span className="text-text">{listing.contactName}</span>
          </p>
        ) : null}
        <ListingContact
          phone={listing.phone}
          whatsapp={listing.whatsapp}
          socialUrl={listing.socialUrl}
          name={listing.name}
        />
      </PageSection>

      {listing.prices.length ? (
        <PageSection id="prices" title={t("listing.prices")}>
          <table className="w-full max-w-xl border-collapse text-left">
            <thead className="sr-only">
              <tr>
                <th>{t("addListing.priceItem")}</th>
                <th>{t("addListing.priceAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {listing.prices.map((p, i) => (
                <tr key={i} className="border-b border-border">
                  <th scope="row" className="py-2.5 pr-4 font-normal">
                    {p.item}
                  </th>
                  <td className="num py-2.5 text-right font-semibold whitespace-nowrap">
                    {formatMoney(p.amount, lang)}
                    {p.unit ? <span className="font-normal text-muted"> / {p.unit}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PageSection>
      ) : null}

      <PageSection id="reviews" title={t("listing.reviews")}>
        <ListingReviews
          listingId={listing.id}
          reviews={listing.reviewList}
          canReview={listing.status === "approved"}
        />
      </PageSection>

      <p>
        <Link
          href={localePath(locale, "/listings")}
          className="font-semibold text-primary hover:underline"
        >
          {t("listing.back")}
        </Link>
      </p>
    </PageContainer>
  );
}
