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
- **User tables** (start empty): users, sessions, visited, wishlist, world_marks, view_history, trips, photos,
  photo_comments, posts, post_comments, likes, reports, suggestions, guide_suggestions,
  trend_votes, trend_comments, listings (+ prices, photos, reviews), leaderboard_entries,
  short_links, daily_stats.

`src/server/db/seed.ts` reads `../data/*.json` and `../assets/places/index.json` (cover paths)
plus the original prose in `../data/content/` (`places.json`: bn/en description, how to get
there, tips and warnings for every place; `districts.json`: bn/en intro and how to reach for
every district; each entry has `reviewed: false` until a human has checked it) and fills the
bilingual columns from it. It replaces the content tables in one transaction, keeping ids
stable, so reseeding never
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

## Accounts and sync

Everything works logged out; an account adds saved trips, view history, a profile and syncing
between devices. Environment variables are documented in [`.env.example`](.env.example)
(`SESSION_SECRET` is required in production; `GOOGLE_CLIENT_ID` turns on "Sign in with Google").

- **Sign-in** (`src/server/auth/`): email + password (argon2id via `@node-rs/argon2`, OWASP
  parameters) and Google Identity Services (the ID token is verified against Google's keys,
  issuer, audience and expiry in `google.ts`; the GIS script loads on `/login` and `/register`
  only). Pages: `/login`, `/register`, `/logout`.
- **Sessions:** a random token in the httpOnly, SameSite=Lax `ubd_session` cookie (`Secure` in
  production); the `sessions` table stores only its HMAC (keyed with `SESSION_SECRET`), the user,
  a CSRF token and the expiry (30 days, extended when used in the second half). A readable
  `ubd_signed_in=1` hint tells the browser to ask `/api/me`, so logged-out visitors cost no request.
- **CSRF:** every mutating request sends `X-CSRF-Token`: the session's token when signed in,
  otherwise a double-submit token from `GET /api/auth/csrf` (httpOnly `ubd_csrf` cookie).
  Cross-site requests (`Sec-Fetch-Site`, foreign `Origin`) are refused too. `authed()` in
  `src/server/auth/http.ts` wraps every signed-in endpoint (401 / 403 / rate limit).
- **Rate limits** (`src/server/auth/limits.ts`, in memory): login 10 per 15 min per IP and per
  email, register 5 per hour per IP, Google 20 per 15 min per IP, signed-in API 600 per minute.
- **Sync** (`src/lib/account/`): on sign-in the browser posts its logged-out visited districts,
  bucket list, world marks and story to `POST /api/me/sync`; the account keeps the union of the
  sets (the further state wins: "been" over "want", "visited" over "wish") and the newest story
  answer per field (each answer carries a change time), and the browser adopts the result. Then
  `createAccountAdapter` (`adapter.ts`) is installed into each store: changes are debounced
  (~400 ms) and posted (`/api/me/visited {add, remove}`, `/api/me/wishlist` and `/api/me/world`
  `{set, clear}`, `/api/me/story {values, times}`), retried with exponential backoff, flushed
  with `keepalive` on `pagehide` / hidden tabs, and re-read on focus, when the tab is shown and
  every 30 s, so two devices stay in step. Signing out flushes, ends the session and clears the
  local copies (they stay in the account).
- **Saved trips:** `/api/trips` (GET, POST) and `/api/trips/:id` (GET, PATCH `{title, isPublic}`,
  DELETE). "Save plan" in the planner posts the plan; `/trip/:id` shows it read-only to its owner,
  and to anyone once it is shared.
- **History:** place and district pages call `recordView` (signed in only; repeat views within
  30 minutes count once, newest 1,000 kept); `GET /api/me/history?page=` pages it 20 at a time.
- **Profile:** `/profile?tab=summary|history|trips|photos|posts|want|settings`; settings change
  name, @handle, language, theme and whether the visited map shows on the public page
  (`/u/:handle`, which shows only shared trips, approved public photos and approved posts), and
  delete history, photos or the whole account (`DELETE /api/me {confirm: handle}`).
- Other endpoints: `GET/PATCH/DELETE /api/me`, `/api/me/summary`, `/api/me/photos` (GET,
  DELETE), `/api/posts/mine`, `/api/users/:handle`.

## Community: photos, posts, suggestions and trending

Everything visitors write or upload is stored `pending` (comments: `pending` → `visible`) and only
shown once a moderator approves it (the admin screens arrive with phase 15). All text is plain:
`src/lib/community/text.ts` strips tags and invisible characters on the way in, React escapes it
on the way out, and nothing is rendered as HTML. Limits and daily quotas live in
`src/lib/community/rules.ts`, shared by the forms and the API.

- **Uploads** (`/upload`, open to everyone): `src/lib/media/prepare.ts` decodes each photo in the
  browser (EXIF rotation applied), draws it on a canvas and re-encodes it as WebP (JPEG where the
  browser cannot write WebP) at most 2000 px, plus a 480 px thumbnail; a byte-level check
  (`src/lib/media/image-bytes.ts`) then removes any EXIF/XMP/IPTC block left. Only these copies
  are sent, so GPS and camera data never leave the device. `POST /api/photos` checks everything
  again: real JPEG/WebP by magic bytes, ≤ 5 MB, ≤ 2000 px (thumbnail ≤ 640 px), metadata stripped
  once more, district and place valid, consent given; 2 batches a day per IP
  (`GET /api/photos/quota` → `{limit, used, remaining}`).
- **Storage:** files go to `MEDIA_DIR` (default `web/storage/media/`, gitignored) as
  `{yyyy}/{mm}/{random}.webp` and `…-t.webp`, served by `GET /media/…`
  (`src/app/media/[...path]/route.ts`) with a one-year immutable cache. Deleting a photo or post
  (or the account) deletes its files.
- **Gallery** (`/gallery?q=&district=&page=`, `GET /api/photos`): masonry of approved public
  photos, search over area/caption, place and district names, district select and map filter.
  **`/photo/:id`** (`GET /api/photos/:id`): the photo, likes, comments (≤ 100 characters,
  `GET/POST /api/photos/:id/comments`) and a report dialog (`POST /api/reports`).
- **Posts** (signed in): the composer on `/profile?tab=posts` (text, emoji picker, district, up
  to 4 photos through the same pipeline); `POST /api/posts`, `PATCH/DELETE /api/posts/:id` (own
  posts only; an edit goes back to `pending`), feed on the home page, profiles and `/post/:id`,
  with 👍 likes, ★ 1–10 ratings (`POST /api/posts/:id/react`), share and comments
  (`/api/posts/:id/comments`, signed in).
- **Suggestions** (`/suggest?kind=place|food`, `POST /api/suggestions`): approved ones show on
  the home page (`GET /api/community/approved?page=`) with ♥, ▲ and ★
  (`POST /api/suggestions/:id/react`).
- **Likes, votes, ratings:** one per visitor per item (`likes` table): the account (`u:<id>`)
  or, logged out, a random device id in the httpOnly `ubd_device` cookie, stored only as an HMAC.
  Cached pages read the visitor's own reactions in one batched `GET /api/reactions`.
- **Trending** (`src/lib/community/season.ts`): one vote per visitor per place per season
  (winter Nov–Feb, summer Mar–May, monsoon Jun–Aug, autumn Sep–Oct; `trend_votes`), via the
  place page's "Add to trending" (`GET/POST /api/trend/vote`) with "why go now?" comments
  (`/api/trend/comments?ref=`). The home ranking is this season's live votes plus the seeded
  snapshot during the season it was taken in (autumn 2026).
- **Tips and corrections** (place and district pages, `POST /api/guide-suggestions`) are private
  to moderators; there is no public read endpoint.
- **Abuse limits:** CSRF on every write (the session token, or the pre-sign-in double-submit
  token), 60 writes a minute per IP, and daily quotas in the `quota_hits` table (Bangladesh day;
  hashed IPs or user ids, never raw IPs): photo batches 2/IP, posts 5/user, suggestions and tips
  5/IP, comments 30, reports 20. `GET /api/community/quota` and `/api/guide-suggestions/quota`
  report what is left.

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

## Design system components

`src/components/ui/` holds every component from DESIGN.md §4, built only from the tokens:
`AppHeader` (logo, Facebook, `ThemeSwitch`, `LanguageSelect`, login/avatar slot, `MenuButton` →
right sheet on phones / dropdown from 768 px), `TabBar`, `Footer`, `Button` / `ButtonLink` /
`IconButton` / `IconLink` / `LinkButton` / `TextLink`, `FilterChip` + `ChipRow`, `KindBadge`,
`StatusTag`, `DistrictChip`, the cards (`PlaceCard`, `PlaceRow`, `DistrictCard`, `RouteCard`,
`TrainRow`, `PhotoTile`, `PostCard`, `ListingCard`, `StatTile`, `FeatureCard`, `CardGrid`), form
controls in `Form.tsx` (`TextInput`, `SearchInput`, `Select`, `DistrictSelect`, `Stepper`,
`SegmentedControl`, `Switch`, `Checkbox`, `Radio`, `Field`), `PillTabs`, `Pagination`,
`Accordion`, `Dialog` / `Sheet` (focus trap and Esc via `useFocusTrap`), `ToastProvider` /
`useToast`, skeletons, `EmptyState`, `LeaderboardRow` and `Avatar`. Navigation config (tabs, menu,
footer columns) is `src/lib/nav.ts`.

- **Icons:** `<Icon name="home" | "kinds/beach" | "kinds-badge/beach" size label?>` inlines the SVGs
  from `../assets/icons`. They are compiled into `src/components/ui/icons.generated.ts` by
  `npm run icons`; a test fails if that file is out of date.
- **Maps:** `src/components/maps/BangladeshMap.tsx` and `WorldMap.tsx` import the path data from
  `../assets/maps/*.json` (alias `@assets`), render the SVG on the server and become interactive
  with `onToggle` / `onSelect` / `onChange`: one tab stop, arrow keys between areas, Enter/Space.
- **Gallery:** `/design` and `/en/design` (noindex, linked nowhere) show every component and state
  in the light and the dark theme side by side. `[data-theme="light|dark"]` works on any element,
  so a part of a page can be previewed in the other theme.
- **Helpers in `globals.css`:** the type scale (`text-hero`, `text-display`, `text-h1` … `text-xs`,
  with +0.1 line height in Bengali), `tap-target` (grows a small control's hit area to 44 px),
  `scrollbar-none`, `fade-x`, `shimmer`, sheet/dialog animations and the map classes.

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
