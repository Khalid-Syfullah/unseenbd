# Unseen BD — web app

The Next.js app for Unseen BD, a Bengali-first travel guide to the 64 districts of Bangladesh.
What to build is in [`../MASTER_PROMPT.md`](../MASTER_PROMPT.md), how it looks in
[`../DESIGN.md`](../DESIGN.md).

Stack: Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Drizzle ORM +
SQLite (better-sqlite3) · Vitest + Testing Library · ESLint + Prettier.

## Run it

```sh
nvm use            # Node 22 (see .nvmrc)
npm install
npm run dev        # http://localhost:3000 (Bengali) and http://localhost:3000/en (English)
```

`npm run dev` and `npm run build` first copy the shared assets from `../assets` into `public/`
(see [Assets](#assets)) and build the database from `../data` (see [Database](#database)), so run
them from a full checkout of the repository.

Production: `npm run build && npm start`. Set `SITE_URL` (for example `https://unseenbd.com`) so
canonical and hreflang URLs are absolute.

## Scripts

| Script                | What it does                                                          |
| --------------------- | --------------------------------------------------------------------- |
| `npm run dev`         | Sync assets and seed the database, then start the dev server          |
| `npm run build`       | Sync assets and seed the database, then make a production build       |
| `npm start`           | Serve the production build                                            |
| `npm run lint`        | ESLint (next + typescript, zero warnings) and `prettier --check`      |
| `npm run typecheck`   | Generate Next route types, then `tsc --noEmit`                        |
| `npm test`            | `vitest run` (jsdom + Testing Library)                                |
| `npm run check`       | **The quality gate:** `lint && typecheck && test && build`            |
| `npm run format`      | Format everything with Prettier (and sort Tailwind classes)           |
| `npm run sync-assets` | Copy `../assets` into `public/` (runs automatically before dev/build) |
| `npm run db:migrate`  | Apply the migrations in `drizzle/`                                    |
| `npm run db:seed`     | Migrate, then reload the content tables from `../data` (idempotent)   |
| `npm run db:reset`    | Delete the database file, migrate and seed                            |
| `npm run db:generate` | Write a new migration after changing `src/server/db/schema.ts`        |

## Locales

| Locale                   | URL                        | Content                               |
| ------------------------ | -------------------------- | ------------------------------------- |
| `bn` (default)           | `/`, `/explore`, …         | Bengali                               |
| `en`                     | `/en`, `/en/explore`, …    | English                               |
| `zh` `fr` `de` `it` `ja` | `/zh`, `/fr/explore`, etc. | Interface translated, English content |

Every page lives under `src/app/[lang]/`. `src/middleware.ts` rewrites un-prefixed paths to
`/bn/…` internally (the URL stays `/…`), leaves `/en/…` and the other prefixed locales alone, and
308-redirects `/bn/…` to the un-prefixed URL so Bengali has one canonical address. The routing
rule itself is the pure function `resolveLocaleRoute` in `src/i18n/routing.ts`.

Helpers in `src/i18n/locales.ts`: `LOCALES`, `isLocale`, `contentLocale(locale)` (`bn` → `bn`,
everything else → `en`), `localePath(locale, path)` to build links, and `HTML_LANG` for
`<html lang>` / `hreflang`. `src/lib/seo.ts` builds canonical + hreflang alternates (bn, en,
x-default = en).

### 404s

- A URL that matches no route (any locale) gets `src/app/global-not-found.tsx`, a whole
  document in Bengali and English (`experimental.globalNotFound` in `next.config.ts`). It is
  needed because the root layout lives under `[lang]`.
- `notFound()` inside a page (an unknown place slug, say) uses `src/app/[lang]/not-found.tsx`.
  Next.js sends that one with status 404 but renders its UI on the client.

## Theme

The `theme` cookie holds `light`, `dark` or `system` (no cookie = `system`). An inline script in
`<head>` (`THEME_SCRIPT` in `src/lib/theme.ts`) runs before first paint and sets
`<html data-theme="light|dark">` (the resolved theme) and `data-theme-pref` (the preference), so
there is no flash. With `system` it follows `prefers-color-scheme` live; without JavaScript the
CSS falls back to `prefers-color-scheme` by itself. `setThemePref()` saves and applies a new
preference; `<ThemeToggle>` uses it.

## Design tokens

`src/app/globals.css` holds the CSS variables from DESIGN.md §2.5 (light, `[data-theme="dark"]`,
and the `prefers-color-scheme` fallback) and maps them into Tailwind:

- colours: `bg-bg`, `bg-raised`, `bg-sunken`, `bg-surface-2`, `border-border`,
  `border-border-strong`, `text-text`, `text-muted`, `text-subtle`, `bg-primary`,
  `text-on-primary`, `bg-primary-wash`, `bg-accent`, `text-on-accent`, `bg-accent-wash`, `text-sun`,
  `text-danger`, `text-success`, `text-info`, `*-map-*`, `bg-overlay`
- fixed brand colours: `forest`, `leaf`, `moss`, `brand-sun`, `marigold`, `river`, `mist`, `clay`,
  `paper`, `sand`, `ink`, `night`, `division-{slug}`, `kind-{kind}`
- radii `rounded-{xs,sm,md,lg,xl,pill}`, shadows `shadow-{1,2,3}`, easing `ease-standard`,
  `ease-emphasized`, fonts `font-display` / `font-ui`
- breakpoints `sm` 480 · `md` 768 · `lg` 1024 · `xl` 1280
- `dark:` matches `[data-theme="dark"]` (and the system setting when no theme is set)

Tailwind's default colour palette is switched off, so only tokens can be used. Never hard-code a
colour in a component.

## Fonts

DM Serif Display and Hind Siliguri (400/600/700) are self-hosted from `src/fonts/` with
`next/font/local` (licences: `src/fonts/OFL-*.txt`). They are exposed as `--font-dm-serif-display`
and `--font-hind-siliguri`, which `--font-display` and `--font-ui` point at.

## Assets

`scripts/sync-assets.mjs` mirrors `../assets/{brand,social,icons,illustrations,maps,places,stamps,badges,card-themes}`
into `public/`, so `assets/maps/bangladesh.json` is served at `/maps/bangladesh.json`,
`assets/places/w640/x.webp` at `/places/w640/x.webp`, and so on. It also puts the favicons and
`apple-touch-icon.png` at the site root and writes `/manifest.webmanifest` with its icon paths
pointing at `/brand/`. All of it is generated and gitignored; change the files in `../assets`.

## Database

Drizzle ORM on SQLite (`better-sqlite3`), file `data/unseenbd.sqlite` (gitignored; override with
`DATABASE_PATH`). The schema is `src/server/db/schema.ts` and stays Postgres-compatible: only
integer, real and text columns (booleans as 0/1, JSON as text, ISO timestamps as text).
Migrations are generated into `drizzle/` with `npm run db:generate`.

- **Content tables** (seeded): `divisions`, `districts`, `kinds`, `months`, `places`, `routes`,
  `routes_from_dhaka`, `trains`, `train_stops`, `train_fares`, `curation` (popular / unseen /
  trending lists), `directory`, `reference`. Places carry nullable bn/en text columns
  (`description`, `how_to_get_there`, `warnings`, `tips`, `accessibility`, `entry_fee`,
  `opening_hours`; tips and warnings are JSON arrays) plus `cover`, `photo` and `image_credit` JSON.
  Districts have nullable bn/en `intro` and `how_to_reach`.
- **User tables** (start empty): users, sessions, visited, wishlist, view_history, trips, photos,
  photo_comments, posts, post_comments, likes, reports, suggestions, guide_suggestions,
  trend_votes, trend_comments, listings (+ prices, photos, reviews), leaderboard_entries,
  short_links, daily_stats.

`src/server/db/seed.ts` reads `../data/*.json` and `../assets/places/index.json` (cover paths)
and replaces the content tables in one transaction, keeping ids stable, so reseeding never
touches user data. It runs in well under a second. If the app opens an empty database it
migrates and seeds it on the spot; tests use `DATABASE_PATH=:memory:` this way.

## Data access and API

`src/server/data/` holds typed, async functions for pages and route handlers: `listPlaces`,
`getPlace`, `getDistrict`, `listDistrictsByDivision`, `getRoute`, `listRoutesFromDhaka`,
`listTrains`, `getTrain`, `placesInMonth`, `placesByKind`, `nearby`, plus kinds, months, curated
lists and map points. Each takes a content language (`toLang(locale)`: `bn` → Bengali, every
other locale → English) and resolves bilingual fields to it, falling back to English.

Read-only JSON endpoints live in `src/app/api/` (`/api/places`, `/api/places/:slug`,
`/api/place-list`, `/api/place-points`, `/api/popular`, `/api/unseen`, `/api/trend`,
`/api/districts/:slug`, `/api/famous`, `/api/routes`, `/api/routes/:slug`, `/api/trains`,
`/api/trains/:slug`). All accept `?lang=bn|en`, send `Cache-Control` for static data, and answer
404 / 400 as JSON.

Season logic is `inSeason(from, to, month)` in `src/lib/season.ts`; it wraps across the year
(11 → 3 is Nov–Mar).

## Interface strings and formatting

Message catalogs are `src/i18n/{bn,en,zh,fr,de,it,ja}.json`, all with the same keys (a test
checks this). Server code calls `getT(locale)` from `src/i18n/messages.ts`; client components
call `useT()` from `src/i18n/client.tsx` (the root layout provides the catalog). `t("key", vars)`
fills `{placeholders}`, formats numbers for the locale and picks plural forms by `count`.
District, division, kind and month names come from the data layer, never from catalogs.

`src/lib/format.ts` formats numbers (Bengali numerals and ১,০০,০০০ grouping in `bn`), money
(`৳22,200`), ranges (`৳980–1,050`), 12-hour times (`সকাল ৭:০০` / `7:00 am`), month ranges
(`Nov – Mar`), dates (`১৪ অক্টোবর, ২০২৬` / `14 October 2026`), durations (`সাড়ে ১০ ঘণ্টা` /
`10.5 hours`), distances and the ★ score.

## Layout

```
src/
  app/[lang]/        pages (layout sets <html lang>, fonts, theme script, metadata)
  app/global-not-found.tsx  404 for unmatched URLs
  components/        UI components
  fonts/             font files + next/font setup
  app/api/           read-only JSON route handlers
  i18n/              locales, routing rule, message catalogs, t()
  lib/               formatters, season and month helpers, theme, SEO and site helpers
  server/db/         Drizzle schema, connection, seed
  server/data/       typed data access for pages and API routes
  middleware.ts      locale rewrites
drizzle/             SQL migrations
scripts/             asset sync and database tasks
test/                app-level tests (unit tests sit next to their code)
```
