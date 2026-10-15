import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink, IconButton, LinkButton, TextLink } from "@/components/ui/Button";
import { CardGrid, FeatureCard, StatTile } from "@/components/ui/Card";
import { isKind, KindBadge, NewDot, StatusTag } from "@/components/ui/Chip";
import { DistrictCard } from "@/components/ui/DistrictCard";
import { EmptyState, PlaceCardSkeleton, RowSkeleton, Skeleton } from "@/components/ui/Feedback";
import { Footer } from "@/components/ui/Footer";
import { Icon, ICON_NAMES } from "@/components/ui/Icon";
import { LeaderboardRow } from "@/components/ui/LeaderboardRow";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { PlaceCard, PlaceRow } from "@/components/ui/PlaceCard";
import { RouteCard, TrainRow } from "@/components/ui/RouteCard";
import { TabBar } from "@/components/ui/TabBar";
import { contentLocale, isLocale, localePath, type Locale } from "@/i18n/locales";
import { getT } from "@/i18n/messages";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import {
  getDistrict,
  listDistricts,
  listDistrictsByDivision,
  listKinds,
  listPlaces,
  listRoutesFromDhaka,
  listTrains,
  toLang,
} from "@/server/data";
import {
  AccordionDemo,
  BangladeshMapDemo,
  DialogDemo,
  DistrictChipsDemo,
  FilterChipsDemo,
  FormsDemo,
  ListingDemo,
  PaginationDemo,
  PillTabsDemo,
  PostDemo,
  ToastDemo,
  WorldMapDemo,
} from "./demos";

type PageProps = { params: Promise<{ lang: string }> };

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false, nocache: true },
};

/* ---------- gallery chrome ---------- */

const SECTIONS = [
  ["tokens", "Tokens"],
  ["icons", "Icons"],
  ["header", "App header"],
  ["tabbar", "Bottom tab bar"],
  ["footer", "Footer"],
  ["buttons", "Buttons"],
  ["chips", "Chips and tags"],
  ["cards", "Cards"],
  ["forms", "Form controls"],
  ["navigation", "Navigation and feedback"],
  ["maps", "Maps"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 py-10">
      <h2 id={`${id}-title`} lang="en" className="mb-5 text-h2">
        {title}
      </h2>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

/** One demo shown twice: in the light theme and in the dark theme. */
function Preview({
  label,
  wide = false,
  children,
}: {
  label: string;
  /** Stack the two themes instead of placing them side by side. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 lang="en" className="text-sm font-semibold text-muted">
        {label}
      </h3>
      <div className={wide ? "flex flex-col gap-4" : "grid gap-4 lg:grid-cols-2"}>
        {(["light", "dark"] as const).map((theme) => (
          <div
            key={theme}
            data-theme={theme}
            className="relative min-w-0 rounded-xl border border-border bg-bg p-4 text-text sm:p-5"
          >
            <span
              lang="en"
              className="absolute top-2 right-3 text-xs font-semibold text-subtle select-none"
            >
              {theme}
            </span>
            <div className="flex flex-col gap-4 pt-3">{children}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

const COLOR_TOKENS = [
  "bg",
  "bg-raised",
  "bg-sunken",
  "surface-2",
  "border",
  "border-strong",
  "text",
  "text-muted",
  "text-subtle",
  "primary",
  "primary-hover",
  "on-primary",
  "primary-wash",
  "accent",
  "on-accent",
  "accent-wash",
  "sun",
  "danger",
  "success",
  "info",
  "focus",
  "map-land",
  "map-hover",
  "map-visited",
  "map-wish",
] as const;

const TYPE_SCALE = [
  ["text-hero font-display", "hero", "Unseen"],
  ["text-display font-display", "display", "13 / 64"],
  ["text-h1", "h1", null],
  ["text-h2", "h2", null],
  ["text-h3", "h3", null],
  ["text-lg", "lg", null],
  ["text-base", "base", null],
  ["text-sm", "sm", null],
  ["text-xs font-semibold", "xs", null],
] as const;

/* ---------- page ---------- */

export default async function DesignPage({ params }: PageProps) {
  const { lang: param } = await params;
  if (!isLocale(param)) notFound();
  const locale: Locale = param;
  const lang = toLang(locale);
  const bn = contentLocale(locale) === "bn";
  const t = getT(locale);

  const [placePage, divisions, districts, sylhet, routes, trains, kinds] = await Promise.all([
    listPlaces({ popular: true, pageSize: 6, lang }),
    listDistrictsByDivision(lang),
    listDistricts(lang),
    getDistrict("sylhet", lang),
    listRoutesFromDhaka(lang),
    listTrains(lang),
    listKinds(lang),
  ]);
  const places = placePage.items;
  const [p1, p2, p3, p4, p5, p6] = places;
  const placeCounts = Object.fromEntries(districts.map((d) => [d.slug, d.placeCount]));
  const sampleRoutes = routes.filter((r) => r.routeSlug).slice(0, 2);
  const sampleTrains = trains.slice(0, 2);
  const divisionGroups = divisions.map((d) => ({
    slug: d.slug,
    name: d.name,
    districts: d.districts.map((x) => ({ slug: x.slug, name: x.name })),
  }));

  const sampleText = bn
    ? "ভোরে শ্রীমঙ্গলের চা-বাগানে কুয়াশা নামে, আর লাউয়াছড়ার বনে উল্লুকের ডাক শোনা যায়। দুপুরে সাত রঙের চা, বিকেলে মাধবপুর লেক। পরের বার বর্ষায় যাব — তখন বন আরও সবুজ।\nটিপস: ছাতা আর জোঁক থেকে বাঁচতে লবণ সঙ্গে রাখুন।"
    : "Mist settles over Sreemangal's tea gardens at dawn, and you can hear gibbons calling in Lawachara forest. Seven-layer tea at noon, Madhabpur lake in the afternoon. Next time I'll go in the monsoon, when the forest is even greener.\nTip: carry an umbrella, and salt for the leeches.";
  const coverPhotos = places
    .filter((p) => p.cover)
    .map((p) => ({ src: p.cover!.w640, alt: p.name }));

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-8">
        <p lang="en" className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
          Unseen BD · DESIGN.md §2–4
        </p>
        <h1 lang="en" className="text-h1">
          Design system
        </h1>
        <p lang="en" className="max-w-[68ch] text-lg text-muted">
          Every component and state, each shown in the light and the dark theme. Switch the language
          to review Bengali and English; hover, focus (Tab) and press to see interaction states.
        </p>
        <Row>
          <ButtonLink
            href={localePath("bn", "/design")}
            variant={bn ? "primary" : "secondary"}
            size="sm"
          >
            বাংলা
          </ButtonLink>
          <ButtonLink
            href={localePath("en", "/design")}
            variant={bn ? "secondary" : "primary"}
            size="sm"
          >
            English
          </ButtonLink>
        </Row>
        <nav aria-label="Sections" lang="en">
          <ul className="flex flex-wrap gap-x-4">
            {SECTIONS.map(([id, title]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* ---------------------------------------------------------------- tokens */}
      <Section id="tokens" title="Tokens">
        <Preview label="Semantic colours (DESIGN.md §2.1)">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COLOR_TOKENS.map((token) => (
              <li key={token} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden
                  style={{ background: `var(--${token})` }}
                  className="size-8 shrink-0 rounded-sm border border-border"
                />
                <code>--{token}</code>
              </li>
            ))}
          </ul>
        </Preview>
        <Preview label="Type scale (DESIGN.md §2.2)">
          {TYPE_SCALE.map(([cls, name, sample]) => (
            <div key={name} className="flex items-baseline gap-3">
              <code className="w-14 shrink-0 text-xs text-subtle">{name}</code>
              <p className={`${cls} min-w-0 truncate`}>{sample ?? t("meta.title")}</p>
            </div>
          ))}
          <p className="num text-lg">
            {formatMoney(22200, lang)} · {formatNumber(1234567, lang)} · {formatPercent(42, lang)}
          </p>
        </Preview>
        <Preview label="Radii and shadows (DESIGN.md §2.3)">
          <Row>
            {(["xs", "sm", "md", "lg", "xl", "pill"] as const).map((r) => (
              <span
                key={r}
                style={{ borderRadius: `var(--r-${r})` }}
                className="flex h-14 w-16 items-center justify-center border border-border-strong bg-raised text-xs"
              >
                {r}
              </span>
            ))}
          </Row>
          <Row>
            {(["shadow-1", "shadow-2", "shadow-3"] as const).map((s) => (
              <span
                key={s}
                className={`flex h-16 w-24 items-center justify-center rounded-lg border border-border bg-raised text-xs ${s}`}
              >
                {s}
              </span>
            ))}
          </Row>
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- icons */}
      <Section id="icons" title="Icons">
        <Preview label="assets/icons/ui, kinds, kinds-badge — <Icon name size>" wide>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8 xl:grid-cols-10">
            {ICON_NAMES.map((name) => (
              <li
                key={name}
                className="flex flex-col items-center gap-1.5 rounded-md bg-raised px-1 py-3 text-center"
              >
                <Icon name={name} size={24} />
                <code className="max-w-full truncate text-[11px] text-muted">{name}</code>
              </li>
            ))}
          </ul>
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- header */}
      <Section id="header" title="App header">
        <Preview
          label="Signed out (Log in) and signed in (avatar). ☰ opens the menu: a right sheet on phones, a dropdown from 768 px."
          wide
        >
          <div className="overflow-hidden rounded-lg border border-border">
            <AppHeader lang={locale} sticky={false} />
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <AppHeader lang={locale} user={{ name: bn ? "করিম" : "Karim" }} sticky={false} />
          </div>
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- tab bar */}
      <Section id="tabbar" title="Bottom tab bar">
        <Preview label="Active: Home · Explore · Gallery (from the URL)">
          <TabBar fixed={false} pathname="/" />
          <TabBar fixed={false} pathname="/en/explore" />
          <TabBar fixed={false} pathname="/gallery/photo-1" />
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- footer */}
      <Section id="footer" title="Footer">
        <Preview label="Footer (FEATURES.md §1.6)" wide>
          <div className="-m-4 overflow-hidden rounded-xl sm:-m-5 [&>footer]:mt-0">
            <Footer
              lang={locale}
              divisions={divisions.map((d) => ({ slug: d.slug, name: d.name }))}
            />
          </div>
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- buttons */}
      <Section id="buttons" title="Buttons">
        <Preview label="Variants (md)">
          <Row>
            <Button>{bn ? "পরিকল্পনা করুন" : "Plan a trip"}</Button>
            <Button variant="accent" icon="my-map">
              {bn ? "আমার মানচিত্র রাঙান" : "Colour my map"}
            </Button>
            <Button variant="secondary">{t("common.share")}</Button>
            <Button variant="ghost">{t("common.seeAll")}</Button>
            <Button variant="danger">{t("common.delete")}</Button>
          </Row>
        </Preview>
        <Preview label="Sizes sm · md · lg, icons, loading, disabled">
          <Row>
            <Button size="sm" icon="plus">
              {bn ? "যোগ করুন" : "Add"}
            </Button>
            <Button size="md" icon="search">
              {t("common.search")}
            </Button>
            <Button size="lg" trailingIcon="arrow-right">
              {bn ? "শুরু করুন" : "Get started"}
            </Button>
          </Row>
          <Row>
            <Button loading icon="upload">
              {bn ? "পাঠানো হচ্ছে" : "Uploading"}
            </Button>
            <Button variant="secondary" loading>
              {t("common.loading")}
            </Button>
            <Button disabled>{t("common.save")}</Button>
            <Button variant="secondary" disabled>
              {t("common.cancel")}
            </Button>
          </Row>
          <Button fullWidth="mobile" variant="accent">
            {bn ? "মূল কাজ: মোবাইলে পুরো চওড়া" : "Main action: full width on mobile"}
          </Button>
        </Preview>
        <Preview label="Icon button · link button · text link · pill">
          <Row>
            <IconButton icon="share" label={t("common.share")} />
            <IconButton icon="heart" label={bn ? "পছন্দ" : "Like"} />
            <IconButton icon="close" label={t("common.close")} disabled />
            <LinkButton trailingIcon="arrow-right">{t("common.showMore")}</LinkButton>
            <TextLink href={localePath(locale, "/design")} trailingIcon="arrow-right">
              {t("common.seeAll")}
            </TextLink>
            <ButtonLink href={localePath(locale, "/design")} variant="secondary" size="sm" pill>
              {t("nav.login")}
            </ButtonLink>
          </Row>
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- chips */}
      <Section id="chips" title="Chips and tags">
        <Preview label="Filter chips: scroll with faded edges on mobile, wrap from 768 px; selected and disabled">
          <FilterChipsDemo
            kinds={kinds.map((k) => ({ key: k.key, label: k.label }))}
            allLabel={t("common.all")}
            label={t("common.kind")}
          />
        </Preview>
        <Preview label="Kind badges">
          <Row>
            {kinds.map((k) =>
              isKind(k.key) ? <KindBadge key={k.key} kind={k.key} label={k.label} /> : null,
            )}
          </Row>
        </Preview>
        <Preview label="Status tags and the new dot">
          <Row>
            <StatusTag tone="sponsored">{t("common.sponsored")}</StatusTag>
            <StatusTag tone="good" icon="calendar">
              {t("common.goodThisMonth")}
            </StatusTag>
            <StatusTag tone="new">{t("ui.new")}</StatusTag>
            <StatusTag tone="info">{t("confidence.high")}</StatusTag>
            <StatusTag tone="danger">{t("confidence.low")}</StatusTag>
            <StatusTag tone="neutral">{t("ui.everyDay")}</StatusTag>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <NewDot /> {t("ui.new")}
            </span>
          </Row>
        </Preview>
        <Preview label="District chips (My Bangladesh): tap to toggle visited">
          <DistrictChipsDemo
            districts={(divisions.find((d) => d.slug === "sylhet")?.districts ?? []).map((d) => ({
              slug: d.slug,
              name: d.name,
            }))}
          />
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- cards */}
      <Section id="cards" title="Cards">
        <Preview label="Place cards (with “Good this month” and ♥ ▲ ★ counts)" wide>
          <CardGrid max={3}>
            {p1 ? (
              <PlaceCard
                place={p1}
                goodThisMonth
                counts={{ likes: 128, votes: 42, stars: p1.stars }}
                priority
              />
            ) : null}
            {p2 ? <PlaceCard place={p2} /> : null}
            {p3 ? <PlaceCard place={{ ...p3, cover: null, description: null }} /> : null}
          </CardGrid>
        </Preview>
        <Preview label="Compact place rows: rank, distance">
          <ol className="flex flex-col">
            {[p4, p5, p6].map((p, i) =>
              p ? (
                <li key={p.slug}>
                  <PlaceRow place={p} rank={i + 1} />
                </li>
              ) : null,
            )}
          </ol>
          {p1 ? <PlaceRow place={p1} aside={bn ? "১২ কিমি" : "12 km"} /> : null}
        </Preview>
        <Preview label="District card · route card · train rows">
          {sylhet ? (
            <DistrictCard
              district={{
                slug: sylhet.slug,
                nameBn: sylhet.nameBn,
                nameEn: sylhet.nameEn,
                placeCount: sylhet.placeCount,
                famousFor: sylhet.famousFor,
              }}
            />
          ) : null}
          {sampleRoutes.map((r) => (
            <RouteCard
              key={r.district.slug}
              route={{
                from: bn ? "ঢাকা" : "Dhaka",
                to: r.district.name,
                href: localePath(locale, `/route/${r.routeSlug}`),
                km: r.roadKm,
                hours: r.busHours,
                fareFrom: r.busFareFromBdt,
                trains: r.directTrains,
              }}
            />
          ))}
          {sampleTrains.map((train) => (
            <TrainRow key={train.slug} train={train} />
          ))}
        </Preview>
        <Preview label="Photo tiles · post card" wide>
          <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
            <div className="columns-2 gap-3 [&>*]:mb-3">
              {places.slice(0, 4).map((p, i) =>
                p.cover ? (
                  <PhotoTile
                    key={p.slug}
                    photo={{
                      src: p.cover.w640,
                      alt: p.name,
                      width: 640,
                      height: i % 2 ? 640 : 427,
                      caption: p.district.name,
                      likes: 12 + i * 7,
                      href: localePath(locale, `/place/${p.slug}`),
                    }}
                    className={i % 2 ? "[&_img]:aspect-square [&_img]:object-cover" : undefined}
                  />
                ) : null,
              )}
            </div>
            <div className="flex flex-col gap-4">
              <PostDemo
                post={{
                  author: bn ? "নাসরিন আক্তার" : "Nasrin Akter",
                  date: "2026-10-12",
                  text: sampleText,
                  photos: coverPhotos.slice(0, 4),
                  likes: 24,
                  stars: 820,
                  comments: 5,
                }}
              />
              <PostDemo
                post={{
                  author: bn ? "তানভীর" : "Tanvir",
                  date: "2026-10-09",
                  text: bn
                    ? "রাতারগুলে নৌকায় এক ঘণ্টা। অসাধারণ!"
                    : "An hour by boat in Ratargul. Wonderful!",
                  photos: coverPhotos.slice(1, 2),
                  likes: 3,
                  comments: 0,
                }}
              />
            </div>
          </div>
        </Preview>
        <Preview label="Listing card (opens the details dialog) · stat tiles · feature cards" wide>
          <CardGrid max={3}>
            <ListingDemo
              bn={bn}
              listing={{
                name: bn ? "চা-বাগান রিসোর্ট" : "Tea Garden Resort",
                category: bn ? "রিসোর্ট" : "Resort",
                area: bn ? "শ্রীমঙ্গল, মৌলভীবাজার" : "Sreemangal, Moulvibazar",
                rating: 4.4,
                reviews: 312,
                image: coverPhotos[2] ?? null,
                imageSource: "Google Maps",
                sponsored: true,
              }}
            />
            <ListingDemo
              bn={bn}
              listing={{
                name: bn ? "পানসী রেস্তোরাঁ" : "Panshi Restaurant",
                category: bn ? "রেস্তোরাঁ" : "Restaurant",
                area: bn ? "জিন্দাবাজার, সিলেট" : "Zindabazar, Sylhet",
                rating: 4.2,
                reviews: 1890,
                image: null,
              }}
            />
          </CardGrid>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={bn ? "দিন" : "Days"} value={formatNumber(4, lang)} />
            <StatTile
              label={bn ? "মোট দূরত্ব" : "Total km"}
              value={formatNumber(1120, lang)}
              sub={bn ? "কিমি" : "km"}
            />
            <StatTile
              label={bn ? "মোট খরচ" : "Total cost"}
              value={formatMoney(22200, lang)}
              money
            />
            <StatTile
              label={bn ? "জনপ্রতি" : "Per person"}
              value={formatMoney(11100, lang)}
              money
              sub={bn ? "২ জন ভ্রমণকারী" : "2 travellers"}
            />
          </div>
          <CardGrid max={3}>
            <FeatureCard
              icon="my-map"
              title={t("nav.myBangladesh")}
              body={
                bn
                  ? "যে জেলাগুলোতে গিয়েছেন, মানচিত্রে রাঙিয়ে নিন।"
                  : "Colour in the districts you have been to."
              }
              href={localePath(locale, "/my-bangladesh")}
            />
            <FeatureCard
              icon="planner"
              title={t("nav.planner")}
              body={
                bn
                  ? "কয়েকটি জেলা বেছে নিন, দিনভিত্তিক পরিকল্পনা পান।"
                  : "Pick a few districts, get a day-by-day plan."
              }
              href={localePath(locale, "/plan")}
            />
            <FeatureCard
              icon="emergency"
              title={t("nav.safety")}
              body={bn ? "জরুরি নম্বর আর গোছগাছের তালিকা।" : "Emergency numbers and packing lists."}
              href={localePath(locale, "/safety")}
            />
          </CardGrid>
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- forms */}
      <Section id="forms" title="Form controls">
        <Preview
          label="Input · invalid · search · select · grouped district select · stepper · segmented control · switch · checkbox · radio"
          wide
        >
          <FormsDemo divisions={divisionGroups} bn={bn} />
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- navigation */}
      <Section id="navigation" title="Navigation and feedback">
        <Preview label="Pill tabs (arrow keys move) · pagination">
          <PillTabsDemo bn={bn} />
          <PaginationDemo />
        </Preview>
        <Preview label="Accordion (one open at a time)">
          <AccordionDemo bn={bn} />
        </Preview>
        <Preview label="Dialog / bottom sheet / side sheet (focus trapped, Esc closes) · toast">
          <DialogDemo bn={bn} />
          <ToastDemo bn={bn} />
        </Preview>
        <Preview label="Skeletons · empty state">
          <div aria-busy="true" className="grid gap-3 sm:grid-cols-2">
            <PlaceCardSkeleton />
            <div className="flex flex-col gap-2">
              <RowSkeleton />
              <RowSkeleton />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          <EmptyState
            illustration="upload"
            body={
              bn
                ? "এই জেলার কোনো ছবি এখনও আসেনি। প্রথম ছবিটি আপনিই দিন।"
                : "No photos of this district yet. Be the first to add one."
            }
            action={
              <ButtonLink href={localePath(locale, "/upload")} icon="upload">
                {t("nav.upload")}
              </ButtonLink>
            }
          />
        </Preview>
        <Preview label="Leaderboard rows">
          <ol className="flex flex-col gap-1">
            {[
              [bn ? "সুমাইয়া" : "Sumaiya", 20],
              [bn ? "রাফি" : "Rafi", 19],
              [bn ? "অনিক" : "Anik", 18],
              [bn ? "জুঁই" : "Jui", 16],
            ].map(([name, score], i) => (
              <LeaderboardRow
                key={String(name)}
                rank={i + 1}
                name={String(name)}
                mode={bn ? "দশ প্রশ্নের দৌড়" : "Ten-question sprint"}
                score={Number(score)}
                total={20}
                highlight={i === 3}
              />
            ))}
          </ol>
          <Row>
            <Avatar name={bn ? "করিম" : "Karim"} size="sm" />
            <Avatar name={bn ? "করিম" : "Karim"} />
            <Avatar name={bn ? "করিম" : "Karim"} size="lg" />
          </Row>
        </Preview>
      </Section>

      {/* ---------------------------------------------------------------- maps */}
      <Section id="maps" title="Maps">
        <Preview label="Bangladesh map — toggle visited (click, or Tab then arrows + Enter), names switch, legend, tooltip">
          <BangladeshMapDemo placeCounts={placeCounts} mode="toggle" />
        </Preview>
        <Preview label="Bangladesh map — select a district (filter), labels, division legend · static mini map">
          <BangladeshMapDemo placeCounts={placeCounts} mode="select" />
          <BangladeshMapDemo placeCounts={placeCounts} mode="static" />
        </Preview>
        <Preview label="World map — visited / want to go / none" wide>
          <WorldMapDemo bn={bn} />
        </Preview>
      </Section>
    </div>
  );
}
