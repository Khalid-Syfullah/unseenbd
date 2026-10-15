import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/discovery/PageHeader";
import { MyListings } from "@/components/listings/MyListings";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { contentLocale, isLocale, localePath } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { alternatesFor } from "@/lib/seo";
import { currentSession } from "@/server/auth/current";
import { listMyListings } from "@/server/data/listings";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("myListings.title"),
    alternates: alternatesFor(lang, "/my-listings"),
    robots: { index: false },
  };
}

/** `/my-listings` (FEATURES.md §7.6): the owner's listings with status, edit and delete. */
export default async function MyListingsPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const t = getT(param);
  const session = await currentSession();
  const listings = session ? await listMyListings(session.user.id, contentLocale(param)) : [];

  return (
    <PageContainer className="max-w-[880px]">
      <PageHeader title={t("myListings.title")} intro={t("myListings.intro")} />
      {!session ? (
        <EmptyState
          illustration={null}
          body={t("myListings.signIn")}
          action={
            <ButtonLink href={localePath(param, "/login")} icon="user" reloadDocument>
              {t("account.submitLogin")}
            </ButtonLink>
          }
        />
      ) : listings.length ? (
        <MyListings listings={listings} />
      ) : (
        <EmptyState
          illustration={null}
          body={t("myListings.empty")}
          action={
            <ButtonLink href={localePath(param, "/add-listing")} icon="plus">
              {t("nav.addListing")}
            </ButtonLink>
          }
        />
      )}
      {session && listings.length ? (
        <div>
          <ButtonLink href={localePath(param, "/add-listing")} icon="plus" variant="secondary">
            {t("nav.addListing")}
          </ButtonLink>
        </div>
      ) : null}
    </PageContainer>
  );
}
