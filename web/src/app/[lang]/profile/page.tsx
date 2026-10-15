import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ConfirmAction,
  DeleteAccount,
  SettingsForm,
  SignOutButton,
  TripShare,
} from "@/components/account/ProfileActions";
import { PostComposer } from "@/components/community/PostComposer";
import { PostFeedCard } from "@/components/community/PostFeedCard";
import { PageContainer } from "@/components/discovery/PageHeader";
import { QueryPagination } from "@/components/discovery/QueryPagination";
import { BangladeshMap } from "@/components/maps/BangladeshMap";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Card, StatTile } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import type { DivisionGroup } from "@/components/ui/Form";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PillTabs } from "@/components/ui/Navigation";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import type { MessageKey, Translator } from "@/i18n/translate";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { firstParam, pageParam, type SearchParams } from "@/lib/params";
import { districtSlugOf, TOTAL_DISTRICTS } from "@/lib/visited/districts";
import { listHistory } from "@/server/account/history";
import { getSummary, listMyPhotos, listWantToGo } from "@/server/account/profile";
import { listDistrictsByDivision } from "@/server/data";
import { listUserPosts } from "@/server/data/community";
import { listTrips, type TripSummary } from "@/server/account/trips";
import { currentSession } from "@/server/auth/current";
import { accountUser } from "@/server/auth/users";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
};

const TABS = ["summary", "history", "trips", "photos", "posts", "want", "settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_ICONS: Record<Tab, IconName> = {
  summary: "my-map",
  history: "clock",
  trips: "planner",
  photos: "gallery",
  posts: "comment",
  want: "heart",
  settings: "user",
};

const isTab = (v: string): v is Tab => (TABS as readonly string[]).includes(v);

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getT(lang);
  return {
    title: t("profile.title"),
    description: t("profile.metaDescription"),
    robots: { index: false, follow: false },
  };
}

/** `/profile` (DESIGN.md §5.10): header, pill tabs and the tab's content, for the signed-in user. */
export default async function ProfilePage({ params, searchParams }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale: Locale = param;
  const t = getT(locale);
  const lang = contentLocale(locale);
  const query = await searchParams;
  const session = await currentSession();
  if (!session) {
    const back = `${localePath(locale, "/profile")}${firstParam(query.tab) ? `?tab=${encodeURIComponent(firstParam(query.tab))}` : ""}`;
    redirect(`${localePath(locale, "/login")}?next=${encodeURIComponent(back)}`);
  }
  const user = session.user;
  const composing = firstParam(query.new) === "post";
  const requested = firstParam(query.tab);
  const tab: Tab = isTab(requested) ? requested : composing ? "posts" : "summary";
  const base = localePath(locale, "/profile");
  const href = (id: Tab) => (id === "summary" ? base : `${base}?tab=${id}`);
  const postsData = tab === "posts" ? await loadPostsTab(user.id, locale) : null;

  return (
    <PageContainer className="gap-6">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-h1">{user.name}</h1>
          <p className="text-muted">
            <Link
              href={localePath(locale, `/u/${user.handle}`)}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              @{user.handle}
            </Link>
            <span aria-hidden> · </span>
            {t("profile.memberSince", { date: formatDate(user.createdAt.slice(0, 10), lang) })}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <ButtonLink href={`${base}?tab=posts&new=post`} icon="plus" size="sm">
            {t("profile.createPost")}
          </ButtonLink>
          <ButtonLink
            href={localePath(locale, "/my-listings")}
            variant="secondary"
            icon="shopping"
            size="sm"
          >
            {t("profile.myListings")}
          </ButtonLink>
          <SignOutButton />
        </div>
      </header>

      <PillTabs
        label={t("profile.tabs.label")}
        value={tab}
        tabs={TABS.map((id) => ({
          id,
          label: t(`profile.tabs.${id}`),
          icon: TAB_ICONS[id],
          href: href(id),
        }))}
      />

      <section aria-label={t(`profile.tabs.${tab}`)} className="flex flex-col gap-5">
        {tab === "summary" ? <SummaryTab userId={user.id} locale={locale} t={t} /> : null}
        {tab === "history" ? (
          <HistoryTab userId={user.id} locale={locale} t={t} page={pageParam(query.page)} />
        ) : null}
        {tab === "trips" ? <TripsTab trips={listTrips(user.id)} locale={locale} t={t} /> : null}
        {tab === "photos" ? <PhotosTab userId={user.id} locale={locale} t={t} /> : null}
        {postsData ? <PostsTab t={t} composing={composing} data={postsData} /> : null}
        {tab === "want" ? <WantTab userId={user.id} locale={locale} t={t} /> : null}
        {tab === "settings" ? <SettingsTab user={accountUser(user)} locale={locale} t={t} /> : null}
      </section>
    </PageContainer>
  );
}

type TabProps = { userId: number; locale: Locale; t: Translator };

function SummaryTab({ userId, locale, t }: TabProps) {
  const lang = contentLocale(locale);
  const s = getSummary(userId);
  const visited = s.visited.map((id) => districtSlugOf(id)!).filter(Boolean);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label={t("profile.summary.visited")}
          value={formatNumber(s.visited.length, lang)}
          sub={t("profile.summary.outOf", { total: TOTAL_DISTRICTS })}
        />
        <StatTile label={t("profile.summary.trips")} value={formatNumber(s.trips, lang)} />
        <StatTile label={t("profile.summary.photos")} value={formatNumber(s.photos, lang)} />
        <StatTile
          label={t("profile.summary.spend")}
          value={formatMoney(s.totalSpend, lang)}
          money
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Card as="section" aria-labelledby="profile-map" className="gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="profile-map" className="text-h3">
              {t("profile.summary.mapTitle")}
            </h2>
            <Link
              href={localePath(locale, "/my-bangladesh")}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("profile.summary.editMap")}
            </Link>
          </div>
          <BangladeshMap visited={visited} label={t("profile.summary.mapLabel")} legend />
        </Card>
        <Card as="section" aria-labelledby="profile-next" className="gap-3 p-5">
          <Image
            src="/illustrations/planner.svg"
            alt=""
            width={200}
            height={150}
            unoptimized
            className="h-auto w-full max-w-[200px]"
          />
          <h2 id="profile-next" className="text-h3">
            {t("profile.summary.planNext")}
          </h2>
          <p className="text-muted">{t("profile.summary.planNextBody")}</p>
          <div>
            <ButtonLink href={localePath(locale, "/plan")} icon="planner">
              {t("profile.summary.planNextAction")}
            </ButtonLink>
          </div>
        </Card>
      </div>
    </>
  );
}

function HistoryTab({ userId, locale, t, page }: TabProps & { page: number }) {
  const lang = contentLocale(locale);
  const history = listHistory(userId, { page, lang });
  if (!history.total) {
    return (
      <EmptyState
        illustration="empty-map"
        body={t("profile.history.empty")}
        action={
          <ButtonLink href={localePath(locale, "/explore")} icon="explore">
            {t("nav.explore")}
          </ButtonLink>
        }
      />
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3">{t("profile.history.title")}</h2>
        <ConfirmAction
          label={t("profile.history.clear")}
          title={t("profile.history.clear")}
          body={t("profile.history.confirm")}
          confirmLabel={t("common.delete")}
          done={t("profile.history.cleared")}
          url="/api/me/history"
        />
      </div>
      <Card as="div" className="p-2">
        <ol className="flex flex-col divide-y divide-border">
          {history.items.map((item) => {
            const target = item.place
              ? { href: `/place/${item.place.slug}`, name: item.place.name }
              : item.district
                ? { href: `/district/${item.district.slug}`, name: item.district.name }
                : null;
            if (!target) return null;
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3">
                <Icon
                  name={item.place ? "pin" : "my-map"}
                  size={20}
                  className="shrink-0 text-primary"
                />
                <Link
                  href={localePath(locale, target.href)}
                  className="min-w-0 flex-1 font-semibold underline-offset-4 hover:text-primary hover:underline"
                >
                  {target.name}
                </Link>
                <span className="text-sm text-muted">
                  {item.place && item.district ? item.district.name : t("profile.history.district")}
                  <span aria-hidden> · </span>
                  <time dateTime={item.viewedAt}>
                    {formatDate(item.viewedAt.slice(0, 10), lang)}
                  </time>
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
      <QueryPagination
        base={localePath(locale, "/profile")}
        params={{ tab: "history" }}
        page={history.page}
        pageCount={history.pageCount}
      />
    </>
  );
}

function tripTitle(trip: TripSummary, t: Translator) {
  return trip.title || t("profile.trips.untitled");
}

function TripsTab({ trips, locale, t }: { trips: TripSummary[]; locale: Locale; t: Translator }) {
  const lang = contentLocale(locale);
  if (!trips.length) {
    return (
      <EmptyState
        illustration="planner"
        body={t("profile.trips.empty")}
        action={
          <ButtonLink href={localePath(locale, "/plan")} icon="planner">
            {t("profile.summary.planNextAction")}
          </ButtonLink>
        }
      />
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {trips.map((trip) => (
        <li key={trip.id}>
          <Card as="article" className="gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-h3">
                <Link
                  href={localePath(locale, `/trip/${trip.id}`)}
                  className="underline-offset-4 hover:text-primary hover:underline"
                >
                  {tripTitle(trip, t)}
                </Link>
              </h2>
              <StatusTag tone={trip.isPublic ? "good" : "neutral"}>
                {t(trip.isPublic ? "profile.trips.public" : "profile.trips.private")}
              </StatusTag>
            </div>
            <p className="num text-sm text-muted">
              {[
                trip.days ? t("profile.trips.days", { count: trip.days }) : null,
                trip.totalCost !== null ? formatMoney(trip.totalCost, lang) : null,
                t("profile.trips.savedOn", { date: formatDate(trip.createdAt.slice(0, 10), lang) }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={localePath(locale, `/trip/${trip.id}`)}
                size="sm"
                icon="arrow-right"
              >
                {t("profile.trips.open")}
              </ButtonLink>
              <TripShare id={trip.id} isPublic={trip.isPublic} />
              <ConfirmAction
                label={t("common.delete")}
                title={t("profile.trips.confirmDelete", { title: tripTitle(trip, t) })}
                body={t("profile.trips.confirmBody")}
                confirmLabel={t("common.delete")}
                done={t("profile.trips.deleted")}
                url={`/api/trips/${trip.id}`}
                variant="ghost"
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

const PHOTO_TONE = { pending: "info", approved: "good", rejected: "danger" } as const;

function PhotosTab({ userId, locale, t }: TabProps) {
  const lang = contentLocale(locale);
  const photos = listMyPhotos(userId, lang);
  const action = (
    <ButtonLink href={localePath(locale, "/upload")} icon="upload">
      {t("profile.photos.add")}
    </ButtonLink>
  );
  if (!photos.length) {
    return <EmptyState illustration="upload" body={t("profile.photos.empty")} action={action} />;
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {action}
        <ConfirmAction
          label={t("profile.photos.deleteAll")}
          title={t("profile.photos.deleteAll")}
          body={t("profile.photos.confirm")}
          confirmLabel={t("common.delete")}
          done={t("profile.photos.deleted")}
          url="/api/me/photos"
        />
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id}>
            <Card as="figure" className="gap-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- user uploads, any size */}
              <img
                src={p.thumb ?? p.src}
                alt={p.caption ?? p.district.name}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="font-semibold">{p.district.name}</span>
                <StatusTag tone={PHOTO_TONE[p.status]}>
                  {t(`profile.photos.status.${p.status}`)}
                </StatusTag>
              </figcaption>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

async function loadPostsTab(userId: number, locale: Locale) {
  const lang = contentLocale(locale);
  const [posts, groups] = await Promise.all([
    listUserPosts(userId, { lang }),
    listDistrictsByDivision(lang),
  ]);
  const divisions: DivisionGroup[] = groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    districts: g.districts.map((d) => ({ slug: d.slug, name: d.name })),
  }));
  return { posts, divisions };
}

function PostsTab({
  t,
  composing,
  data: { posts, divisions },
}: {
  t: Translator;
  composing: boolean;
  data: Awaited<ReturnType<typeof loadPostsTab>>;
}) {
  return (
    <>
      <Card as="section" aria-labelledby="compose-title" className="gap-3 p-4 md:p-5">
        <h2 id="compose-title" className="text-h3">
          {t("posts.composerTitle")}
        </h2>
        <p className="text-sm text-muted">{t("posts.composerIntro")}</p>
        <PostComposer divisions={divisions} autoFocus={composing} />
      </Card>
      {posts.length ? (
        <ul className="grid items-start gap-3 md:grid-cols-2">
          {posts.map((post) => (
            <li key={post.id}>
              <PostFeedCard post={post} owner divisions={divisions} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState illustration="empty-map" body={t("profile.posts.empty")} />
      )}
    </>
  );
}

function WantTab({ userId, locale, t }: TabProps) {
  const lang = contentLocale(locale);
  const want = listWantToGo(userId, lang);
  const names = new Intl.DisplayNames([locale === "bn" ? "bn" : locale], { type: "region" });
  const countryName = (key: string) => {
    if (!/^[A-Z]{2}$/.test(key)) return key;
    try {
      return names.of(key) ?? key;
    } catch {
      return key;
    }
  };
  if (!want.places.length && !want.countries.length) {
    return (
      <EmptyState
        illustration="empty-map"
        body={t("profile.want.empty")}
        action={
          <ButtonLink href={localePath(locale, "/bucket-list")} icon="heart">
            {t("profile.want.openBucket")}
          </ButtonLink>
        }
      />
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <Card as="section" aria-labelledby="want-places" className="gap-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="want-places" className="text-h3">
            {t("profile.want.places")}
          </h2>
          <Link
            href={localePath(locale, "/bucket-list")}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("profile.want.openBucket")}
          </Link>
        </div>
        {want.places.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {want.places.map((p) => (
              <li key={p.slug} className="flex items-center gap-3 py-2.5">
                <Icon name="heart" size={18} className="shrink-0 text-sun" />
                <Link
                  href={localePath(locale, `/place/${p.slug}`)}
                  className="min-w-0 flex-1 font-semibold underline-offset-4 hover:text-primary hover:underline"
                >
                  {p.name}
                </Link>
                <span className="text-sm text-muted">{p.district}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t("profile.want.empty")}</p>
        )}
      </Card>
      <Card as="section" aria-labelledby="want-countries" className="gap-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="want-countries" className="text-h3">
            {t("profile.want.countries")}
          </h2>
          <Link
            href={localePath(locale, "/world")}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("nav.world")}
          </Link>
        </div>
        {want.countries.length ? (
          <ul className="flex flex-wrap gap-2">
            {want.countries.map((key) => (
              <li key={key} className="rounded-pill bg-surface-2 px-3 py-1.5 text-sm font-semibold">
                {countryName(key)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t("profile.want.noCountries")}</p>
        )}
      </Card>
    </div>
  );
}

function SettingsTab({
  user,
  locale,
  t,
}: {
  user: ReturnType<typeof accountUser>;
  locale: Locale;
  t: Translator;
}) {
  const section = (id: string, title: MessageKey, body: ReactNode, intro?: MessageKey) => (
    <Card as="section" aria-labelledby={id} className="gap-4 p-5">
      <h2 id={id} className="text-h3">
        {t(title)}
      </h2>
      {intro ? <p className="text-muted">{t(intro)}</p> : null}
      {body}
    </Card>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      {section(
        "settings-profile",
        "profile.settings.title",
        <>
          <SettingsForm user={user} />
          <Link
            href={localePath(locale, `/u/${user.handle}`)}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("profile.settings.viewPublic")}
          </Link>
        </>,
      )}
      {section(
        "settings-data",
        "profile.settings.data",
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <ConfirmAction
              label={t("profile.history.clear")}
              title={t("profile.history.clear")}
              body={t("profile.history.confirm")}
              confirmLabel={t("common.delete")}
              done={t("profile.history.cleared")}
              url="/api/me/history"
            />
            <ConfirmAction
              label={t("profile.photos.deleteAll")}
              title={t("profile.photos.deleteAll")}
              body={t("profile.photos.confirm")}
              confirmLabel={t("common.delete")}
              done={t("profile.photos.deleted")}
              url="/api/me/photos"
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted">{t("profile.settings.deleteAccountBody")}</p>
            <div>
              <DeleteAccount handle={user.handle} />
            </div>
          </div>
        </div>,
        "profile.settings.dataBody",
      )}
    </div>
  );
}
