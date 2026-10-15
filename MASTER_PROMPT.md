# Master prompt — build a Bangladesh travel guide with the full feature set of unseenbd.com

> Paste everything below the line into an AI coding agent (Claude Code or similar). It describes **what to build**, the **data model**, the **algorithms** and the **acceptance criteria**. Seed data is in `data/` of this repository; the brand (**Unseen BD**), maps, icons, illustrations, stamps, badges and place covers are in `assets/` (see `assets/README.md` and `assets/brand/BRAND.md`) — use them instead of drawing new ones. Write all user-facing copy fresh — do not copy unseenbd.com's text, photos or branding; build your own product with an equivalent feature set.

---

## 0. Role and goal

You are a senior full-stack engineer and product designer. Build a fast, privacy-respecting, **Bengali-first, bilingual (bn/en)** travel guide and trip-planning web app for all **64 districts / 8 divisions of Bangladesh**. It must work without an account, load quickly on slow mobile connections, and be fully crawlable (server-rendered HTML for every public page).

Deliver a production-ready monorepo with: web app, API, database migrations, seed scripts that import `data/*.json`, admin moderation screens, tests, and deployment instructions.

## 1. Product principles

1. **Free, no trackers, no third-party ad networks.** Self-host fonts and images. Strict Content-Security-Policy. Count traffic only as daily aggregates. Any paid placement is always labelled "বিজ্ঞাপন / Sponsored".
2. **Works logged-out.** Personal state (visited districts, bucket list, world map, game records) lives in `localStorage`; signing in merges and syncs it to the account.
3. **Mobile-first.** Persistent bottom tab bar; thumb-reachable controls (min 44 px); every page usable at 360 px wide.
4. **Trustworthy data.** Every fare, timetable and schedule shows an "as of" date, a confidence level (high/medium/low) and source links. Photos show photographer + licence.
5. **Bengali first.** Default locale `bn` at `/`, English at `/en/...`. Bengali numerals and month names in `bn`. Interface strings also in zh, fr, de, it, ja (content stays bn/en).

## 2. Stack

**Next.js (App Router) + TypeScript** in `web/` — server components give server-rendered HTML for every public page, with client islands for interactive parts. **Tailwind CSS v4** mapped to the tokens in `DESIGN.md`. **Drizzle ORM + SQLite** (`better-sqlite3`) for a single server, with a Postgres-compatible schema. JSON API under `/api/*` (route handlers). PWA manifest + service worker (offline-saved district pages). Google Identity Services + email/password auth with a session cookie and CSRF token. Vitest + Testing Library + Playwright. Deployed with pm2 behind nginx on EC2. The numbered build prompts in `prompts/` turn this into concrete phases; run them with the `/build-unseenbd` skill.

## 3. Information architecture (routes)

Each public route exists in `bn` (`/x`) and `en` (`/en/x`) with `hreflang` alternates.

| Route | Page |
|---|---|
| `/` | Home |
| `/explore` | Explore places (search + district/type/month filters + map) |
| `/place/:slug` | Place guide (257 seeded) |
| `/district/:slug` | District guide (64) |
| `/kind/:kind` | Places by type (11) |
| `/month/:month` | Places in season (12) |
| `/unseen` | Lesser-known places by division |
| `/best-places?division=` | Popular destinations |
| `/near-me` | Nearest places from a district or GPS |
| `/search?q=` | Unified search |
| `/bucket-list` | Want-to-see / been-there checklist |
| `/plan` | Multi-district trip planner |
| `/trip-cost` | A→B trip cost calculator |
| `/routes` | Routes & fares hub; `/route/:from-to-:to` (150 seeded) |
| `/trains` | Intercity train list; `/train/:slug` (120 seeded) |
| `/safety` | Emergency numbers, location sharing, safety tips, packing lists |
| `/foreign-tour` | 13 popular countries from Bangladesh |
| `/my-bangladesh` | Visited-districts map, levels, share card maker |
| `/world` | Visited / want-to-go world map (195 countries) |
| `/play` | Game hub (4 games + leaderboards) |
| `/quiz/bangladesh`, `/quiz/famous`, `/quiz/personality` | Quizzes |
| `/challenge?c=` | Friend challenge landing |
| `/gallery`, `/photo/:id`, `/upload` | Community photos |
| `/stay`, `/restaurants`, `/shopping`, `/listings`, `/listing/:id` | Directory |
| `/add-listing?kind=business|food|product`, `/my-listings` | Owner submissions |
| `/profile`, `/u/:handle`, `/trip/:id` | Account |
| `/login`, `/register` | Auth |
| `/about` (with `#privacy`) | About, credits, privacy, terms, data verification |
| `/admin/*` | Moderation & stats |

Unknown routes render a friendly 404 with links to Explore/Home/My Bangladesh and all 64 districts.

## 4. Data model (seed from `data/`)

- **Division** (`divisions.json`): `slug`, `name_bn`, `name_en`, `district_ids`.
- **District** (`districts.json`): `id` 1–64, `slug`, `name_bn`, `name_en`, `division`, centroid `lat/lng`, `famous_for_bn[]`/`famous_for_en[]` (foods, crafts), `places[]`, `from_dhaka` summary. Add your own `intro` and `how_to_reach` text (bn/en).
- **Place** (`places.json`, `places.csv`): `id`, `slug`, `name_bn`, `name_en`, `district_id`, `kind` ∈ {beach, island, hill, waterfall, forest, river, tea, heritage, spiritual, city, village}, `popular` (130) / `unseen` (127), `best_from_month`–`best_to_month` (wraps across the year, e.g. 7→2), `visit_hours`, `lat/lng`, `stars` (editorial score; display as ★ ⌊stars/100⌋/10), `image_credit {by, license, source}`, `nearby[]`. Add your own fields: `description`, `how_to_get_there`, `warnings`, `tips`, `accessibility`, `entry_fee`, `opening_hours` (bn/en).
- **Kind** (`kinds.json`) and **Month** (`months.json`): labels + ordered place lists.
- **Route** (`routes.json`): `from`, `to`, `road_km`; `bus {km, hours[min,max], terminals[], arrives, chart{seat40, seat51, from, asOf}, nonAc{min,max,asOf}, ac{min,max,asOf}, operators[{name, ac: ac|non-ac|both}], confidence, asOf, sources[]}`; `trains[]`, `trains_back[]` (train slugs); `water[]` (launch/steamer: status, departs, hours, deck/single/double cabin fares, vessels, km, confidence, sources); `flight {fromAirport, airport, airlines[], minutes, perDay|perWeek, sources}`; `places_at_destination[]`. Plus `routes_from_dhaka.json` (63 summaries: km, bus hours, cheapest bus fare, number of direct trains).
- **Train** (`trains.json`): `no`, `slug`, `name_bn/en`, `off_day` (0=Sun…6=Sat or null), `from/to` station + district, `dep`, `arr`, `minutes`, `stops[{station, station_en, districtId, arr, dep, minutes}]`, `fares[{from, to, cls, fare}]` with classes `shovon`, `shovon_chair`, `snigdha`, `first_seat`, `first_berth`, `ac_seat`, `ac_berth`; `timetable` (WTT reference), `confidence`, `as_of`, `sources`, `return_train`.
- **Curation** (`curation.json`): the 24 popular slugs, unseen slugs, a trending snapshot (votes, likes, comments, stars).
- **Directory** (`directory_snapshot.json`): hotels, resorts, restaurants, malls with category, area, rating, review count.
- **Reference** (`reference.json`): languages, budget levels, map-card themes/sizes/exports, level thresholds, games and quiz rules, emergency numbers, packing-list groups, foreign-tour countries, booking links, listing size tiers.
- **User-generated tables** (start empty): `users`, `sessions`, `visited(user_id, district_id)`, `wishlist`, `view_history`, `trips` (saved plans with cost), `photos` (status pending/approved/rejected, public flag, district, optional place, likes), `photo_comments`, `posts`, `post_comments`, `likes`, `reports`, `suggestions` (places/foods from visitors), `guide_suggestions` (tips & corrections), `trend_votes`, `trend_comments`, `listings` (+ `listing_prices`, `listing_photos`, `listing_reviews`), `leaderboard_entries` (game, name, score, approved), `short_links` (district ids + optional name only), `daily_stats`.

## 5. Features to build

### 5.1 Shell
- Header: logo/wordmark, Facebook link, light/dark switch (cookie + `prefers-color-scheme`), language select (7 locales), Login or avatar, hamburger menu with every section.
- Bottom tab bar on all pages: Home · My Bangladesh · Explore · Planner · Gallery.
- Footer: link groups (Explore, Nearby, Trip planning, Foreign travel, Divisions → `/best-places?division=`), top players, About/Safety/Privacy, language switch, credit line.

### 5.2 Home
Hero (title, one-paragraph pitch, "free · no trackers" note) → dismissible partner banner → directory tiles (hotels, resorts, food) → owner "add" tiles (business, home food, product) → CTA buttons (colour my map, plan next trip, play quiz, write a post, add photo) → unified search → "my map" widget (mini map, N unseen districts, progress) → latest photos carousel → posts feed (paginated, like, ★, share, comments) → approved visitor suggestions (♥ likes, ▲ votes, ★) → "Trending this season" top-10 + paginated more → popular destinations (24, division chips) → "how much have you seen" CTA → what-is explainer → type chips (11) → month chips + current-month section with division filter → 5 unseen picks with "good this month" badge → 64 districts by division (solid underline = visited, dotted = not) → routes CTA with quick links → feature overview cards → FAQ accordion (also FAQPage JSON-LD).

### 5.3 Explore & discovery
- `/explore`: text search; District / Type / Month selects; "only unseen" toggle; **all filters mirrored in the URL**. Inline SVG Bangladesh map (district polygons from geoBoundaries ADM2): clicking a district sets the district filter and highlights it; optional district labels; collapsible map. Paginated card grid (photo, name, district · type, two-line intro, best months).
- Place page: hero image + credit; type badge; breadcrumb; actions **Want to go**, **Share** (Web Share API → copy-link fallback), **Add to trending (count)**, **Write an experience or warning**; sections: what you will see/do, how to get there, editor's note (warnings + quick facts: best months, time needed, km and cheapest bus from Dhaka linking to the route page), nearby essentials buttons that open Google Maps searches around the coordinates (hotels, restaurants, mosques & places of worship, hospitals & pharmacies, police, ATMs & banks, toilets & parking), comparison with nearby places, **listen to the intro** (Web Speech API, bn/en voice), one-day nearby trip suggestion, pre-trip checklist, accessibility notes, **embeddable map snippet** (iframe code + copy), opening/fees/emergency box, traveller photos, more in this district, stay & eat in this district, send tip/correction. Record a view in history when signed in.
- District page: title with place count, division, locator map, Share, **I've been here** (toggles visited), **Keep offline** (cache page + images via service worker), famous-for chips, how to reach from Dhaka + route link, places, photos, local listings, nearby districts.
- `/kind/:kind`, `/month/:month` (month logic must handle wrap-around seasons), `/unseen` grouped by division with counts, `/best-places`.
- `/near-me`: start district select or **Use my location** (Geolocation API, only on click), type chips, list sorted by haversine distance with "Directions" → `https://www.google.com/maps/dir/?api=1&destination=lat,lng` (new tab).
- `/search?q=`: one query across districts, places (bn/en names + transliteration), photos (captions/places) and posts; grouped results.
- `/bucket-list`: all places grouped by type, per-row "Want to see" / "Been there" toggles, ticked counter; localStorage + account sync.

### 5.4 Trip planner (`/plan`) — implement exactly this model
Inputs: start district, destination districts (add/remove; optional places per destination), **order by shortest path** toggle, **return to start** toggle, travellers (stepper, ≥1), budget level `low|mid|high`.

1. **Leg distance** between districts *a, b*: haversine between centroids × road factor (1.3; 1.45 if either end is a hill-tracts district — Bandarban, Khagrachhari, Rangamati) + 8 km, rounded to the nearest 5 km, minimum 10 km. Prefer real `road_km` from `routes.json` when available.
2. **Leg hours** = round to nearest 0.5 of (km / 42 + 0.5).
3. **Ordering**: if ≤7 destinations, brute-force all permutations minimising total km (including the return leg when enabled); otherwise nearest-neighbour then 2-opt until no improvement.
4. **Default sights** per destination when the user picks none: up to 3 popular places with `visit_hours ≤ 8`, else places with `visit_hours ≤ 3`; visit shortest first.
5. **Day packing**: each day has 9 usable hours. A travel leg uses min(hours, 9); a sight uses `visit_hours + 0.5`. When the next item does not fit and the day already has items, end the day (overnight in the current district) and start a new one; long legs/sights spill over.
6. **Costs (BDT)** by level — low: bus 2.9/km/person, hotel 1,200/room/night, food 500/person/day, local transport 300/person per sightseeing day; mid: bus 4.6/km, hotel 3,000, food 900, local 700; high: private car 42/km per vehicle (1 vehicle per 4 people), hotel 7,000, food 1,600, local 1,200. Per-person bus fare = max(80, round(km × rate / 10) × 10). Rooms = ⌈people / 2⌉; pay hotel only for nights away from the start district. Misc/entry fees = 8 % of the subtotal rounded to 50; total rounded to 100.
7. **Output**: summary tiles (days, total km, total, per person); **Save plan** (account) and **Print / PDF** (print stylesheet); route map with numbered stops; day cards (legs with km · hours · per-person fare; sights with hours; "sleep in X"); cost table (transport, stay, food, local, entry & misc, total, per person); disclaimer that figures are estimates. A **Sample: Dhaka → Cox's Bazar** button fills the form.

Acceptance test: Dhaka → Cox's Bazar, 2 people, mid, return on → 3 days, 840 km, leg fare ৳1,930 per person, transport 7,720, stay 6,000, food 5,400, local 1,400, misc 1,650, **total ৳22,200 (৳11,100 per person)**.

### 5.5 Trip cost calculator (`/trip-cost`)
Inputs: from, to, travellers (1–30), nights (0–60), level, round trip. Days = nights + 1. Transport = per-person fare × people × (2 if round trip) (car mode: km × 42 × ⌈people/4⌉ × legs). Stay = nights × ⌈people/2⌉ × hotel. Food = days × people × food. Local = days × people × local. Buffer = 8 % rounded to 50; total rounded to 100. Show total, per person, road km, breakdown and **Add to trip plan** (`/plan?add=<district>`). Acceptance: Dhaka → Cox's Bazar, 2 people, 2 nights, mid, round trip → **৳25,200**.

### 5.6 Routes, trains, safety
- `/routes`: pick any two districts → route page (or a computed fallback); Dhaka → 63 districts grouped by division (km, direct trains, cheapest bus fare).
- Route page: everything in the Route model, each block with as-of date, confidence chip and source links; booking links (Bangladesh Railway e-ticket, Shohoz bus, Biman / US-Bangla / Novoair).
- `/trains`: 120 intercity trains (name + number, from → to, dep–arr in 12-hour Bengali time-of-day words, weekly off-day); filter by station/district.
- Train page: stop table, fare matrix by class and segment, timetable reference, sources, link to return train.
- `/safety`: tap-to-call emergency numbers (999, 333, 16263, 109), **share my location** (Geolocation → copyable Google Maps link / share sheet), tips, packing lists (always, monsoon, winter, hills, sea & islands).
- `/foreign-tour`: 13 country cards by region with highlight cities; links to `/world` and `/plan`.

### 5.7 My Bangladesh (`/my-bangladesh`) and My World (`/world`)
- Tick districts (search, per-division lists with "whole division", or tap the SVG map). Show `N / 64`, % seen, level (Explorer 10, Traveller 25, Adventurer 40, Master 50, Legend 64) and next goal.
- Persistence: `localStorage` set of district ids; when signed in, queue adds/removes, debounce ~400 ms, `POST /api/me/visited {add, remove}`, merge the server's ids, retry with exponential backoff, flush on `pagehide`/`visibilitychange`; cross-tab sync via the `storage` event.
- Share: optional display name; Share / WhatsApp / Facebook / Copy link; **short link** stores only district ids + name; **Challenge a friend** link.
- **Card maker** (canvas): type Map / Level / Passport; 6 colour themes; sizes 1.91:1, 4:5, 1:1, 9:16; custom photo, caption, hometown, label size, coloured districts / district photos / zoom to hometown; trip pins (district, date, note). Export PNG, a 3D map animation as WEBM (MediaRecorder on canvas) and a 360° spin; ready-made post text in 4 styles (short, detailed, stylish, emoji) with hashtags and copy.
- Passport stamps per visited district (clearly "a game passport, not an official document"); "My Bangladesh story" (district of birth, upbringing, study, work, favourite).
- `/world`: 195-country SVG map, mark Visited / Want to go / clear, per-continent counts, country search, share link, memory pins, image export using the same card engine.

### 5.8 Games & quizzes
- `/play` tabs: **Ten-question sprint** (district → division championship, 20 questions, challenge link), **Photo clue** (identify a district from its silhouette; 20 rounds, 4 options, one try, +1/−1), **Memory pairs** (8 face-down cards = 4 districts + their 4 divisions, 30-second timer from first flip, daily seeded layout, fewer moves wins), **Distance duel** (order 4 districts nearest → farthest from a target using centroid distances; 20 rounds). Daily seed so everyone gets the same set; five-round personal record in localStorage.
- Leaderboards per game (top 100): name + score only; names appear after admin approval; server-side score verification (signed round tokens). Leaderboard image card + share link.
- `/quiz/bangladesh` (district → division, 20 Q), `/quiz/famous` (food/product → district using `famous_for_*`, 20 Q), `/quiz/personality` (6 picks among 4 place types → your travel style, just for fun).

### 5.9 Community
- `/upload`: open to everyone; name, optional private email, up to 3 photos per batch (≤5 MB each), district, optional place. **Resize and re-encode in the browser** (canvas → WebP/JPEG) so EXIF/GPS never leaves the device; 2 batches per day per IP with remaining-count message; all photos pending until moderated.
- `/gallery`: masonry grid, area/place search, district select, map filter, pagination. `/photo/:id`: image, district/place, uploader display name, like, comments (≤100 chars), report.
- Posts (signed-in): text + emoji + photos; feed with likes, ★ rating, share, comments; "my posts" in profile.
- Visitor suggestions of places and famous foods/products → admin approval → shown with likes/votes/rating. "Send a tip or correction" on place/district pages (private to admins).
- Trending: one vote per user/device per place per season; seasonal ranking; comments.

### 5.10 Directory & owner listings
- `/stay` (hotels + resorts with area chips), `/restaurants`, `/shopping`: cards with photo-source credit, category, ★ rating, review count, "View details" dialog with "Open in Google Maps"; separate "added by owners" sections; sponsored items labelled.
- `/add-listing`: kind tabs (hotel/resort/restaurant · home-made food · product), size tier (small ≤5 prices & 3–5 photos; medium ≤12 & 3–8; large ≤25 & 3–10), name, district, area, description (≤600 chars), repeatable price rows (item, ৳ amount, unit), phone (`01XXXXXXXXX`), WhatsApp, social link, photos, contact name, hidden honeypot field; submit for review; daily quota. `/my-listings` shows status.

### 5.11 Account & profile
Email/password (hashed) and Google sign-in. Profile header (name, @handle, Create post, My listings) and tabs: **Summary** (visited districts, trips, photos, total spend across trips, visited map, plan-next-trip CTA), **History**, **Trips**, **Photos**, **My posts**, **Want to go**, **Settings**. Users can delete their own history, photos and posts; provide account deletion.

### 5.12 Admin
Dashboards for photos, posts, suggestions, guide suggestions, listings and listing reviews, reports, leaderboard approvals, editorial stars, and daily stats (date range).

## 6. API surface (JSON, `?lang=bn|en` where content is localised)
Public: `GET /api/places?district=&kind=&month=&unseen=&q=&page=`, `/api/places/:slug`, `/api/place-list?kind=|month=`, `/api/place-points`, `/api/popular`, `/api/unseen`, `/api/trend`, `/api/trend/comments?ref=`, `/api/districts/:slug`, `/api/famous`, `/api/routes`, `/api/routes/:slug`, `/api/trains`, `/api/trains/:slug`, `/api/photos?page=&district=&q=`, `/api/photos/:id`, `/api/photos/:id/comments`, `/api/posts?page=&q=`, `/api/posts/:id`, `/api/posts/:id/comments`, `/api/listings?…`, `/api/listings/:id`, `/api/listing-topics`, `/api/leaderboard?game=`, `/api/quiz-stats`, `/api/links`, `/api/map/card-photos`, `/api/users/:handle`, `/api/trips/:id`, `/api/community/approved?page=`.
Signed-in: `/api/me`, `/api/me/summary`, `/api/me/visited` (GET/POST add/remove), `/api/me/history`, `/api/me/photos`, `/api/me/wishlist`, `/api/trips` (CRUD), `/api/posts/mine`, `/api/my/listings` (CRUD).
Quotas: `/api/photos/quota`, `/api/listings/quota`, `/api/community/quota`, `/api/guide-suggestions/quota`. Admin: `/api/admin/{photos,community,suggestions,guide-suggestions,listings,listing-reviews,reports,leaderboard,stars,stats}`.
Rate-limit everything (e.g. 3,000 req/min/IP) and disallow `/api/` plus account pages in robots.txt.

## 7. SEO
Server-render every public page with a unique `<title>`/description, canonical, OpenGraph/Twitter image, `hreflang` (bn, en, x-default=en). Title patterns: place "{name}, {district}: how to get there and when to go", district "{district} district: N places to visit", month "Places to visit in Bangladesh in {month}: N places in season", train "{train} ({no}) timetable, stops and fares". JSON-LD: WebSite, Organization, FAQPage (home), TouristAttraction + GeoCoordinates (places), BreadcrumbList. Generate `sitemap.xml` for bn + en of all public routes; image `max-image-preview:large`.

## 8. Visual design
Use the **Unseen BD** brand in `assets/brand/` (mark, lockups, favicons, PWA icons) and its tokens from `assets/brand/BRAND.md`: forest `#0E6B4E` (primary, visited districts), sun `#E2483A`, marigold `#F2A541` (accent), river `#2E86A8`, paper `#FBF6EC` / sand `#F1E6D0` (light), ink `#10172E` / night `#0A1024` (dark). Display type DM Serif Display, UI and Bengali text Hind Siliguri (self-hosted, OFL). Warm, editorial, illustrated: the home hero is `assets/illustrations/hero-home.svg`, place cards use `assets/places/w640/{slug}.webp` (detail pages `w1200`), place-type chips and map markers use `assets/icons/kinds*/` and `assets/icons/markers/`, interface icons come from `assets/icons/ui/`. Maps are `assets/maps/bangladesh-districts.svg` / `bangladesh.json` and `world-countries.svg` / `world.json`; passport stamps, level badges and card-maker themes are in `assets/stamps/`, `assets/badges/` and `assets/card-themes/`. Cards with soft rounded corners, light borders and generous padding; tabular Bengali numerals for prices; accessible contrast in both themes, visible focus rings, reduced-motion support.

## 9. Non-functional
Lighthouse ≥ 90 on mobile; images in WebP at 640/1280 widths with lazy loading; route-level code splitting; HTTP caching for static data; CSP with only self + Google Identity; no third-party analytics; WCAG 2.1 AA; i18n strings in JSON catalogues; unit tests for the planner, cost calculator, month-wrap logic and visited-sync queue; e2e tests for explore filters, planner sample, upload flow and language switch.

## 10. Definition of done
- All routes in §3 render server-side in bn and en with correct metadata.
- Seed import loads 8 divisions, 64 districts, 257 places, 11 kinds, 12 months, 150 routes, 63 Dhaka summaries, 120 trains.
- Planner and cost calculator reproduce the acceptance figures in §5.4 and §5.5.
- My Bangladesh works offline/logged-out and syncs after login without losing ticks.
- Uploads never send EXIF/GPS; nothing user-generated is public before approval.
- No third-party trackers in the network panel.
