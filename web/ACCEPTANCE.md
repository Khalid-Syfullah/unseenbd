# Acceptance checklist

This checklist goes through [`MASTER_PROMPT.md` §10](../MASTER_PROMPT.md#10-definition-of-done)
one item at a time. Each item says how it was checked and which tests check it again on every
run. The release review covered the non-functional list in §9 and security; both follow after
the checklist.

Verified on 16 October 2026 against a production build (`npm run build`, served by `npm start`).

```sh
cd web
npm run check          # lint, typecheck, 558 unit/integration tests, production build
npx playwright test    # 22 end-to-end journeys + 20 visual snapshots (needs the build)
```

`npx playwright test` starts the production server on port 3100 with a throwaway database and
media folder in `web/.e2e/`. It seeds them from `../data` and creates one admin, so a run never
touches `data/unseenbd.sqlite`.

## Definition of done (§10)

- [x] **All routes in §3 render server-side in bn and en with correct metadata.**
  - `e2e/journeys/routes.spec.ts` fetches every public route in §3 as plain HTTP, with no
    JavaScript. That is 34 routes, with an example for each dynamic one: place, district, kind,
    month, route, train, `best-places?division=`, `search?q=`, `challenge?c=` and
    `add-listing?kind=`. It runs once for Bengali (`/…`) and once for English (`/en/…`).
  - Each page must:
    - answer 200 with `<html lang>` set to the locale
    - have a `<title>`, a meta description and an `<h1>` in the HTML
    - have a canonical URL, `hreflang` bn / en / x-default and an OpenGraph title
    - have a title that no other page uses
  - The title patterns in §7 are checked for place, district, month and train. This review
    fixed the month and train titles to match §7 (`lists.monthMetaTitle` and `train.metaTitle`
    in all seven catalogues). The JSON-LD on place pages (TouristAttraction, GeoCoordinates and
    BreadcrumbList) is checked too.
  - Sign-in and account pages (`/login`, `/register`, `/my-listings`) render with
    `noindex`. `/profile` redirects to `/login?next=…` when you are signed out. `/admin` is a
    404 for visitors.
  - Unknown URLs answer 404 with links to Explore and to all 64 districts.
  - The sitemap lists bn and en URLs. `robots.txt` disallows `/api/` and the account pages.
  - Pages that hold user content (`/photo/:id`, `/u/:handle`, `/trip/:id`, `/listing/:id`,
    `/post/:id`) are rendered and tested with their data in `test/community-pages.test.tsx`,
    `test/profile.test.tsx` and `test/directory-pages.test.tsx`.

- [x] **Seed import loads 8 divisions, 64 districts, 257 places, 11 kinds, 12 months, 150 routes,
      63 Dhaka summaries, 120 trains.**
  - Counted in the database built by `npm run db:seed`: divisions 8, districts 64, places 257,
    kinds 11, months 12, routes 150, routes_from_dhaka 63, trains 120 (plus 1,664 train stops
    and 1,586 segment fares).
  - Checked on every run by `src/server/db/seed.test.ts`.
  - `GET /api/health` reports `db.places: 257` (`e2e/journeys/privacy.spec.ts`).

- [x] **Planner and cost calculator reproduce the acceptance figures in §5.4 and §5.5.**
  - **Planner:** the sample is Dhaka → Cox's Bazar, 2 people, mid budget, return on.
    `e2e/journeys/planner.spec.ts` clicks "Sample: Dhaka → Cox's Bazar" and reads the page:
    - 3 days, 840 km, a leg fare of ৳1,930 per person
    - transport ৳7,720, stay ৳6,000, food ৳5,400, local ৳1,400, misc ৳1,650
    - **total ৳22,200, ৳11,100 per person**
    - the same figures after a reload, because the plan is kept in the URL
  - **Trip cost:** Dhaka → Cox's Bazar, 2 people, 2 nights, mid budget, round trip gives
    **৳25,200** (৳12,600 per person). Turning off round trip changes it. "Add to trip plan"
    opens the planner with that trip.
  - The algorithms themselves are unit-tested in `src/lib/planner/planner.test.ts`,
    `src/lib/planner/order.test.ts` and `test/planner.test.tsx`.

- [x] **My Bangladesh works offline/logged-out and syncs after login without losing ticks.**
  - **Logged out:** `e2e/journeys/my-bangladesh.spec.ts` ticks districts on the map, reloads,
    and finds them still ticked.
  - **Offline:** `e2e/journeys/offline.spec.ts` opens My Bangladesh once, cuts the network,
    reloads, ticks a district and reloads again. This review found that the service worker
    skipped My Bangladesh, because Next.js marks it `no-store`, so it did not open offline.
    `public/sw.js` now keeps the browser-only tools (`OFFLINE_APPS`) for offline use.
  - **Kept district:** a district saved with "Keep offline" opens without a network. A page
    that was never opened shows the offline page instead of an error; this review fixed that page
    so it now caches its own scripts.
  - **Sync:** `e2e/journeys/account.spec.ts`:
    1. Ticks Rangamati while logged out, then creates an account.
    2. The server has `[Rangamati]`, so the tick was merged.
    3. A second browser signs in and sees Rangamati.
    4. Ticks Khulna there; the server then has both.
    5. The first browser shows both.
  - The queue (debounce, backoff, flush on `pagehide`, merge) is unit-tested in
    `test/account-sync.test.ts` and `src/lib/visited/visited.test.ts`.

- [x] **Uploads never send EXIF/GPS; nothing user-generated is public before approval.**
  - `e2e/journeys/upload.spec.ts` uploads `e2e/fixtures/photo-with-gps.jpg`. It is a 1600×1200
    JPEG with an EXIF block: GPS latitude and longitude, camera make and model, and a
    description.
  - It captures the bytes of every file the page sends. They are re-encoded on the device:
    there is no `Exif` block and none of the camera or description strings.
  - The files stored on the server contain none of it either.
  - The photo is not in `/api/photos` or the gallery until an admin approves it in `/admin`;
    after that it is. The admin then deletes it, which removes its files.
  - Server-side stripping, magic-byte checks, quotas and the pending → approved rules for photos,
    posts, comments, suggestions, listings and leaderboard names are covered by
    `test/community.test.ts`, `test/directory.test.ts`, `test/leaderboard.test.ts` and
    `src/lib/media/*.test.ts`.

- [x] **No third-party trackers in the network panel.**
  - `e2e/journeys/privacy.spec.ts` records every request a real browser makes while it loads and
    scrolls 10 pages: home, explore, a place, a district, planner, My Bangladesh, games, gallery,
    upload and login.
  - Not one goes to another origin. Fonts and images are self-hosted, and there are no
    analytics.
  - Google Identity Services loads only on `/login` and `/register`, and only when
    `GOOGLE_CLIENT_ID` is set.
  - The Content-Security-Policy enforces the same rule in the browser (see below).

## End-to-end journeys (`e2e/journeys/`)

| Journey                                                                      | Spec                     |
| ---------------------------------------------------------------------------- | ------------------------ |
| Explore filters mirrored in the URL, map click sets and clears the district  | `explore.spec.ts`        |
| Place page: want to go, share (copy fallback), add to trending, write a tip  | `place.spec.ts`          |
| Planner sample (exact figures) and trip cost (৳25,200)                       | `planner.spec.ts`        |
| My Bangladesh tick → share link → short link → shared map                    | `my-bangladesh.spec.ts`  |
| A full 20-question round of the ten-question sprint, record kept             | `game.spec.ts`           |
| Upload with an EXIF/GPS fixture → moderation → public → deleted              | `upload.spec.ts`         |
| Sign up → sign in on a second browser → sync both ways                       | `account.spec.ts`        |
| Language switch bn ⇄ en, dark theme applied and remembered                   | `language-theme.spec.ts` |
| District kept offline; My Bangladesh offline                                 | `offline.spec.ts`        |
| Every §3 route server-rendered with metadata (bn + en), 404, sitemap, robots | `routes.spec.ts`         |
| No third-party requests, security headers, health check                      | `privacy.spec.ts`        |

Visual snapshots of the key screens at 360 px and 1280 px are in `e2e/visual.spec.ts`. Run them
on their own with `npm run test:visual`.

## Non-functional (§9)

| Requirement                                                                   | Status                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse ≥ 90 on mobile                                                     | **Not measured in this review.** Lighthouse needs Chrome DevTools against the deployed site. Run it on the live site after deploying (PageSpeed Insights, mobile).                                                        |
| WebP images at 640/1280 with lazy loading                                     | Place covers are served at `w640`/`w1200` WebP with `loading="lazy"` below the fold (phases 03/16). Uploads are re-encoded to WebP at ≤ 2000 px plus a 480 px thumbnail.                                                  |
| Route-level code splitting                                                    | App Router chunks per route. Shared first-load JS is 103 kB (`npm run build` output).                                                                                                                                     |
| HTTP caching for static data                                                  | `/api/*` content endpoints send `public, max-age=3600, s-maxage=86400, stale-while-revalidate`. `/_next/static` and copied assets get long caches (`next.config.ts`, nginx in DEPLOY.md). Media is immutable for a year.  |
| CSP with only self + Google Identity                                          | Yes, see [Security review](#security-review). Checked by `test/release.test.ts` and `privacy.spec.ts`.                                                                                                                    |
| No third-party analytics                                                      | Yes: no third-party requests (`privacy.spec.ts`). Traffic is counted only as daily aggregates (`/api/visit` → `daily_stats`).                                                                                             |
| WCAG 2.1 AA                                                                   | Covered by the phase 17 audit: contrast tokens in both themes, focus rings, 44 px targets, keyboard maps, reduced motion. Not re-audited here beyond the journeys, which find their controls by role and accessible name. |
| i18n strings in JSON catalogues                                               | `src/i18n/{bn,en,zh,fr,de,it,ja}.json`. A test checks that they all have the same keys.                                                                                                                                   |
| Unit tests for planner, cost calculator, month-wrap logic, visited-sync queue | `src/lib/planner/*.test.ts`, `test/planner.test.tsx`, `src/lib/season.test.ts`, `test/account-sync.test.ts`, `src/lib/visited/*.test.ts`.                                                                                 |
| e2e tests for explore filters, planner sample, upload flow, language switch   | Yes, plus the other journeys above.                                                                                                                                                                                       |

## Production readiness

- **Server:** `npm start` runs `server.mjs`.
  - Listens on `PORT` and `LISTEN_HOST`.
  - Writes one JSON log line per request (method, path without the query, status, ms, request
    id) and one for start, stop and crashes. Next's request errors are logged the same way by
    `src/instrumentation.ts`.
  - **Graceful shutdown:** on SIGTERM/SIGINT it stops accepting connections, drains requests
    for up to `SHUTDOWN_TIMEOUT_MS` and closes SQLite. pm2 `wait_ready` is supported.
  - Manual test: start, three requests, SIGTERM. The log shows "shutting down" → "database
    closed" → "stopped".
- **Health:** `GET /api/health` returns 200 `{status, version, build, uptime, time, db: {ok, places, ms}}`,
  or 503 when the database cannot be read. It is not cached and not rate limited.
- **Configuration:** every variable is in `.env.example`. The database, media and photos paths
  (`DATABASE_PATH`, `MEDIA_DIR`, `PHOTOS_DIR`) are configurable. The `db:*` and `admin:create`
  scripts read the same `.env*` files as the server (`scripts/load-env.ts`).
- **Deploy:** [`DEPLOY.md`](DEPLOY.md) covers one Ubuntu arm64 EC2 instance with nginx, pm2
  ([`ecosystem.config.cjs`](ecosystem.config.cjs)) and Let's Encrypt. It also has release
  folders with rollback, `db:migrate` + `db:seed` on each deploy, and backups.

## Security review

**Headers** (`src/server/security-headers.ts`, applied to every response in `next.config.ts`):

- **`Content-Security-Policy`:**
  - `default-src 'self'`
  - `connect-src`, `font-src`, `worker-src` and `manifest-src` set to `'self'`
  - `img-src 'self' data: blob:`, `media-src 'self' blob:`
  - `frame-src 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
  - `frame-ancestors 'none'`
  - On `/login` and `/register` only, Google Identity Services is allowed:
    `accounts.google.com/gsi/client`, `/gsi/style`, and `/gsi/` for frames and connections.
    Links into those pages load a full document so their policy applies (`reloadDocument` on
    `ButtonLink`). If the GSI script is still blocked, the page reloads once.
- **`Strict-Transport-Security`:** `max-age=63072000; includeSubDomains`.
- **Framing:** `X-Frame-Options: DENY`, plus `frame-ancestors 'none'` in the CSP.
- **`Referrer-Policy`:** `strict-origin-when-cross-origin`.
- **`Permissions-Policy`:** `geolocation=(self)`. Camera, microphone, payment, USB, serial,
  Bluetooth, MIDI, motion sensors, display capture and topics are all off.
- **`Cross-Origin-Opener-Policy`:** `same-origin`, or `same-origin-allow-popups` on the
  sign-in pages for the Google popup.
- **Others:** `X-Content-Type-Options: nosniff`, and no `X-Powered-By`.
- Uploaded media keeps its own `default-src 'none'; sandbox`.

`script-src` keeps `'unsafe-inline'`. The App Router streams its page data as inline scripts,
and almost every public page is prerendered (static or ISR), so there is no per-request nonce to
put on them. The risk is limited in other ways:

- nothing a visitor writes is rendered as HTML: text is stripped on input and escaped by React
- the only `dangerouslySetInnerHTML` uses are build-time constants and JSON-LD with `<` escaped
- `connect-src`, `form-action` and `img-src` stop data from leaving for another origin

**Rate limits and quotas:**

- **Global limit:** 3,000 requests a minute per IP on every page and API route, in
  `src/middleware.ts`. `/api/health` is exempt.
- **Existing per-endpoint limits** were kept: login 10/15 min per IP and per email, register
  5/hour, writes 60/min, signed-in API 600/min, short links 20/hour, leaderboard, and daily
  quotas for photos, posts, suggestions, tips, comments, reports and listings.
- **nginx** adds `limit_req` on `/api/` (DEPLOY.md).

**Fixes made in this review:**

- **Spoofable client IP.** The client IP came from the _first_ `X-Forwarded-For` hop, which the
  client controls. It now comes from `X-Real-IP`, or else the last hop. nginx overwrites both
  headers, and the app binds to 127.0.0.1.
- **Unbounded request bodies.** JSON bodies were read whole before their size was checked. They
  are now read with a hard cap (`src/server/body.ts`). Multipart uploads without a
  `Content-Length` are refused (411), and nginx caps bodies at 60 MB.
- **Forgeable device ids.** Anonymous device ids (likes, votes, stars, reports) are now signed
  with an HMAC, so a client cannot make up a new id per request. New ids are also rationed to 200
  per IP per day (`DAILY.devices`).
- **Quota keys.** The report and listing-review quotas used the device id, which can be dropped.
  They now use the account, or the hashed IP.
- **No origin check.** `POST /api/share` and `POST /api/leaderboard` now refuse cross-site
  requests (`sameOrigin`).
- **Development session secret.** The fallback secret was used whenever `NODE_ENV` was not
  `production`, staging included. It is now used only when `NODE_ENV` is `development` or `test`;
  anywhere else the app requires `SESSION_SECRET`.

**Input validation** was checked on every route handler. All of them:

- type and length-check their input (`checkText`)
- whitelist enums and parse ids strictly
- clamp page numbers
- return 400/413/415 on malformed input, never 500

Admin endpoints require the admin role (404 otherwise). Owner-only edits check ownership.
`/media` and `/photos` reject path traversal. All writes need a CSRF token, or a same-origin
check where there is no session.

**No secrets in the repository:**

- `.env*` is gitignored except `.env.example`, which has empty values.
- No database, upload or key file is tracked.
- The only literal secrets are test-only values in `playwright.config.ts` and the tests, and the
  development fallback, which production refuses.

**Known and accepted:**

- **Login lockout per email.** The per-email login limit lets a stranger lock one email out of
  password sign-in for 15 minutes; the account owner can still use Google. This trades against
  password spraying.
- **Edits have no daily quota.** Edits to your own posts and listings return them to moderation.
  They are rate limited (60 writes a minute) but have no daily quota.
- **`npm audit --omit=dev`** reports PostCSS advisories in the copy bundled inside `next`. It is
  only used at build time on our own CSS. The fix is a major Next.js upgrade (16), left for a
  separate change.
- **One process.** Rate limits live in memory, which suits the single pm2 process in DEPLOY.md.
  More processes would need a shared store.
