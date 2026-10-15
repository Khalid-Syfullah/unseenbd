import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostFeedCard } from "@/components/community/PostFeedCard";
import { PageContainer, PageSection } from "@/components/discovery/PageHeader";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatDate, formatMoney } from "@/lib/format";
import { districtSlugOf, TOTAL_DISTRICTS } from "@/lib/visited/districts";
import { getPublicProfile } from "@/server/account/profile";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ lang: string; handle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, handle } = await params;
  if (!isLocale(lang)) return {};
  const profile = await getPublicProfile(decodeURIComponent(handle), contentLocale(lang));
  if (!profile) return {};
  const t = getT(lang);
  return {
    title: `${profile.name} (@${profile.handle})`,
    description: t("publicProfile.metaDescription", { name: profile.name }),
    robots: { index: false, follow: true },
  };
}

/** `/u/:handle`: someone's public page. Only things they made public are shown. */
export default async function PublicProfilePage({ params }: PageProps) {
  const { lang, handle } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const content = contentLocale(locale);
  const t = getT(locale);
  const profile = await getPublicProfile(decodeURIComponent(handle), content);
  if (!profile) notFound();
  const nothing =
    !profile.trips.length && !profile.photos.length && !profile.posts.length && !profile.visited;

  return (
    <PageContainer className="gap-8">
      <header className="flex items-center gap-4">
        <Avatar name={profile.name} size="lg" />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-h1">{profile.name}</h1>
          <p className="text-muted">
            @{profile.handle}
            <span aria-hidden> · </span>
            {t("profile.memberSince", {
              date: formatDate(profile.createdAt.slice(0, 10), content),
            })}
          </p>
        </div>
      </header>

      {nothing ? <EmptyState illustration="empty-map" body={t("publicProfile.empty")} /> : null}

      {profile.visited ? (
        <PageSection
          id="map"
          title={t("publicProfile.map")}
          aside={
            <p className="num text-muted">
              {t("publicProfile.visitedCount", {
                count: profile.visited.length,
                total: TOTAL_DISTRICTS,
              })}
            </p>
          }
        >
          <Card as="div" className="p-4">
            <BangladeshMap
              visited={profile.visited.map((id) => districtSlugOf(id)!).filter(Boolean)}
              label={t("publicProfile.mapLabel", { name: profile.name })}
              legend
            />
          </Card>
        </PageSection>
      ) : null}

      {profile.trips.length ? (
        <PageSection id="trips" title={t("publicProfile.trips")}>
          <ul className="grid gap-3 md:grid-cols-2">
            {profile.trips.map((trip) => (
              <li key={trip.id}>
                <Card as="article" className="gap-1 p-4">
                  <h3 className="text-h3">
                    <Link
                      href={localePath(locale, `/trip/${trip.id}`)}
                      className="underline-offset-4 hover:text-primary hover:underline"
                    >
                      {trip.title || t("profile.trips.untitled")}
                    </Link>
                  </h3>
                  <p className="num text-sm text-muted">
                    {[
                      trip.days ? t("profile.trips.days", { count: trip.days }) : null,
                      trip.totalCost !== null ? formatMoney(trip.totalCost, content) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {profile.photos.length ? (
        <PageSection id="photos" title={t("publicProfile.photos")}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {profile.photos.map((p) => (
              <li key={p.id}>
                <Card as="figure" className="gap-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user uploads, any size */}
                  <img
                    src={p.thumb ?? p.src}
                    alt={p.caption ?? p.district.name}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <figcaption className="p-3 text-sm font-semibold">
                    <Link
                      href={localePath(locale, `/photo/${p.id}`)}
                      className="underline-offset-4 hover:text-primary hover:underline"
                    >
                      {p.district.name}
                    </Link>
                  </figcaption>
                </Card>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {profile.posts.length ? (
        <PageSection id="posts" title={t("publicProfile.posts")}>
          <ul className="grid items-start gap-3 md:grid-cols-2">
            {profile.posts.map((post) => (
              <li key={post.id}>
                <PostFeedCard post={post} />
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}
    </PageContainer>
  );
}
