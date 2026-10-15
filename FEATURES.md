# unseenbd.com — feature list

Walked through feature by feature on 15 Oct 2026 (Bengali `/` and English `/en` versions), plus a full crawl of all 1,294 sitemap URLs. Counts below are as of that date.

**What the site is:** *Unseen Bangladesh / অদেখা বাংলাদেশ* — a free, tracker-free travel guide, map and trip planner for all 64 districts of Bangladesh, with 257 places (130 well-known, 127 "unseen"), 150 route pages, 120 intercity train timetables, games, and community photos/posts. Bengali first, English second, 5 more interface languages.

---

## 1. Global shell

| # | Feature | Details |
|---|---|---|
| 1.1 | Header | Logo + "UNSEEN BANGLADESH / অদেখা বাংলা" wordmark, Facebook link, light/dark theme switch, language dropdown, Login button (or avatar when signed in), hamburger menu |
| 1.2 | Hamburger menu | Home, My Bangladesh, Explore, Planner, Gallery, My World, Add photo, Unseen places, Routes & fares, Train timetable, Play quiz, Emergency info & safety, About, Privacy, Profile, My listings |
| 1.3 | Bottom tab bar (always visible) | Home · My Bangladesh · Explore · Planner · Gallery |
| 1.4 | Languages | বাংলা (default, `/`), English (`/en/...`), plus 中文, Français, Deutsch, Italiano, 日本語 as interface languages |
| 1.5 | Theme | Light / dark toggle, remembered in a cookie; also follows `prefers-color-scheme` |
| 1.6 | Footer | Groups: Explore · Nearby · Trip planning · Foreign travel · Divisions (8 links to `/best-places?division=`) · Top players; plus About, Safety, Privacy, Facebook, language switch, "Developed by …" credit |
| 1.7 | PWA | Web manifest (standalone, theme `#080a1e`), 192/512 icons, service worker; "keep offline" button on district pages |
| 1.8 | SEO | Server-rendered HTML per route with `<title>`, meta description, OpenGraph/Twitter cards, `hreflang` bn/en, JSON-LD (WebSite, Organization, FAQPage), sitemap.xml (1,294 URLs), robots.txt blocking `/api/` and account pages |
| 1.9 | Privacy posture | No ad networks or trackers; self-hosted fonts and images; strict CSP; only daily aggregate visit counts; any paid placement is labelled "বিজ্ঞাপন / Sponsored" |
| 1.10 | 404 page | Friendly "page not found" with links to Explore/Home/My Bangladesh and all 64 district links |

## 2. Home page (`/`)

1. Hero: tagline, one-paragraph pitch, "Free, no trackers" note.
2. Partner banner (Deshtool.com) with category chips and a dismiss ✕.
3. Directory tiles: Best hotels · Resorts & retreats · Where to eat.
4. Owner submission tiles: Add hotel/resort/restaurant · Add home-made food · Add your product.
5. Call-to-action buttons: Colour my map · Plan next trip · Play quiz · Write a post · Add your travel photo.
6. Global search box ("e.g. Sajek or Sunamganj") → `/search?q=` (searches districts, places, photos and posts together).
7. "My map" widget: mini Bangladesh map with visited districts, "N districts still unseen", progress ticks, "Colour them in →".
8. Latest traveller photos carousel (district-tagged) with "See all".
9. Traveller posts feed: author, date, text/photos, 👍 count, ★ x/10 rating, Share, Comments; paginated (1/6).
10. Visitor-submitted places & foods (admin-approved): type badge, district, ♥ likes, ▲ upvotes, ★ rating; "Add a place from your area" / "Add a famous food or product".
11. "Trending this season" top-10 leaderboard of places (♥ likes, ▲ votes, ★ score) + "More trending" paginated list (1/10).
12. Popular destinations grid (24 places) with division filter chips (All + 8 divisions), each card: photo, name, district · type, short intro, best months.
13. "How much of Bangladesh have you seen?" CTA → My Bangladesh / Games.
14. "What is Unseen Bangladesh?" explainer + About link.
15. "Where is your heart today?" — 11 place-type chips + "All places".
16. "By month" — 12 month chips; current-month section ("Places for October") with division filter and 9 cards.
17. "Off the beaten path" — 5 unseen places with "Good this month" badge.
18. "64 districts, one by one" — districts grouped by 8 divisions; visited districts get a solid underline, others dotted.
19. "Which way, how much" — routes CTA with 8 quick links (Dhaka → Cox's Bazar, Sylhet, …) + train timetable.
20. Feature overview cards: Travel map · Find places by district · Trip planner · Photo gallery · Profile & history · Emergency numbers & packing.
21. FAQ accordion (6 questions), also emitted as FAQPage JSON-LD.

## 3. Discovery

| # | Feature | URL | What it does |
|---|---|---|---|
| 3.1 | Explore | `/explore` | Text search + District, Type and Month dropdowns + "Only unseen" toggle; all filters sync to the query string (`?kind=waterfall&district=3&month=10`). Clickable Bangladesh map: click a district to filter, optional district name labels, hide/show map. Paginated card grid, then all 64 districts grouped by division |
| 3.2 | Place page | `/place/{slug}` (257) | Hero photo with Wikimedia credit + licence, type badge, breadcrumb; buttons: Want to go, Share, "Add to trending · N", Write an experience/warning. Sections: Experience (what to see/do), How to get there, Editor's note with Warnings and Other info (best months, time needed, distance & bus fare from Dhaka), nearby essentials (hotels, restaurants, mosques/places of worship, hospitals/pharmacies, police, ATMs/banks, toilets/parking — via Google Maps), compare with nearby places, listen to the intro (text-to-speech), one-day nearby trip, pre-trip checklist, accessibility info, embeddable map code (copy), opening/fare/emergency info, traveller photos, more in this district, stay & eat in this district, send a tip/correction |
| 3.3 | District page | `/district/{slug}` (64) | Title with place count, division, locator map, Share / "I've been here" / "Keep offline"; "Famous for" chips (foods, crafts); how to get there from Dhaka + link to the route page; list of places; district photos; local businesses, home food & products; nearby districts |
| 3.4 | Place type pages | `/kind/{kind}` (11) | Beaches 9 · Islands 7 · Hills 9 · Waterfalls 9 · Forests 15 · Rivers & haors 44 · Tea gardens 2 · History & heritage 87 · Religious sites 59 · Cities & parks 6 · Village & culture 10 |
| 3.5 | Month pages | `/month/{month}` (12) | Places in season that month (e.g. 120 in October) |
| 3.6 | Unseen places | `/unseen` | 127 lesser-known places grouped by division, with district · type · season |
| 3.7 | Best places | `/best-places?division=` | The 24 popular destinations with division filter |
| 3.8 | Near me | `/near-me` | Pick a start district or "Use my location" (geolocation); type chips; places sorted by straight-line distance; "Directions" opens Google Maps in a new tab |
| 3.9 | Search | `/search?q=` | One box searching districts, places, photos and posts |
| 3.10 | Bucket list | `/bucket-list` | Every place grouped by type with "Want to see" / "Been there" toggles and an "X of Y ticked" counter |

## 4. Planning tools

| # | Feature | URL | What it does |
|---|---|---|---|
| 4.1 | Trip planner | `/plan` | Start district + any number of destination districts; "order by shortest path"; "return to start"; travellers stepper; budget level (Thrifty / Moderate / Plush). Output: days, total km, total cost, per-person cost; "Save plan" (account) and "Print / PDF"; route map with numbered stops; day-by-day itinerary (legs with km · hours · fare per person, sights with hours, where you sleep); cost table (transport, stay, food, local transport, entry fees & misc). "Sample: Dhaka → Cox's Bazar" button |
| 4.2 | Trip cost calculator | `/trip-cost` | From, To, travellers, nights, budget level, round-trip toggle → total, per person, road km, breakdown (transport, stay, food, local, buffer) + "Add to trip plan" |
| 4.3 | Routes & fares hub | `/routes` | Pick any two districts → "Show ways"; Dhaka to 63 districts grouped by division with km, train count and starting bus fare |
| 4.4 | Route page | `/route/{a}-to-{b}` (150) | Road distance; bus: km, hours range, departure terminals, arrival stand, government fare chart (40/51-seat), non-AC and AC fare ranges with dates, operators (AC / non-AC / both), confidence level, sources; direct trains each way; launch/steamer services (status, vessels, deck/cabin fares); flights (airports, airlines, minutes, frequency); places at the destination |
| 4.5 | Train timetable | `/trains` | 120 Bangladesh Railway intercity trains: name (number), from → to, departure–arrival, weekly off-day |
| 4.6 | Train page | `/train/{name-no}` (120) | Every stop with arrival/departure and elapsed minutes, fare table per class and segment, timetable reference (WTT), confidence, sources, link to the return train, link to e-ticket site |
| 4.7 | Safety & packing | `/safety` | Tap-to-call emergency numbers (999, 333, 16263, 109), share-your-location helper, travel safety tips (hill tracts permits, red flags at sea, slippery trails, ID at checkpoints, ask before photographing people, life jackets, carry rubbish back), packing lists: always / monsoon / winter / hills / sea & islands |
| 4.8 | Foreign tour guide | `/foreign-tour` | 13 countries popular from Bangladesh by region with highlight cities; link to world map and planner |

## 5. Personal maps & gamification

| # | Feature | URL | What it does |
|---|---|---|---|
| 5.1 | My Bangladesh | `/my-bangladesh` | Tick visited districts (search box, per-division lists, "whole division" button, or tap the map). Progress "N / 64", % seen, level title, next goal. Saved in the browser (localStorage) and synced to the account when signed in |
| 5.2 | Share & challenge | same page | Optional name, Share / WhatsApp / Facebook / Copy link / Short link; "Challenge a friend". Link encodes only the districts + name; short link stores just those two on the server |
| 5.3 | Card maker | same page | Card type Map / Level / Passport; 6 colour themes (Dusk, Dawn, Jamdani, Padma, Earth, Mist); 4 sizes (1.91:1, 4:5, 1:1, 9:16); custom photo, caption, hometown, name size, coloured districts / district photos / zoom to home; trip pins (district, date, note); export PNG, 3D WEBM video, 360°; ready-made post text in 4 styles with hashtags + copy |
| 5.4 | Levels | same page | Explorer 10 · Traveller 25 · Adventurer 40 · Master 50 · Legend 64 districts |
| 5.5 | Passport stamps | same page | A stamp per visited district ("a game passport, not an official document") |
| 5.6 | My Bangladesh story | same page | Pick district of birth, growing up, study, work, favourite … |
| 5.7 | My World | `/world` | World map of 195 countries: mark Visited / Want to go / clear; per-continent counts; search countries; share link; pin travel memories (country, date, note); image maker (same card engine) |
| 5.8 | Game hub | `/play` | Four daily games, five-round personal record: Ten-question sprint (district → division championship, challenge link), Photo clue (identify a district from its silhouette, 20 rounds, +1/−1), Memory pairs (match 4 districts to divisions, 30-second timer, layout changes daily), Distance duel (order 4 districts nearest → farthest). Verified leaderboards per game (top 100, names + points only), leaderboard card maker, share link |
| 5.9 | District quiz | `/quiz/bangladesh` | 20 questions: which division is this district in; leaderboard |
| 5.10 | Famous things quiz | `/quiz/famous` | 20 questions: which district is this food/product from; one attempt each; leaderboard |
| 5.11 | Travel personality quiz | `/quiz/personality` | 6 picks between 4 place types; most-picked type is your style |

## 6. Community & user-generated content

| # | Feature | URL | What it does |
|---|---|---|---|
| 6.1 | Photo gallery | `/gallery` | Masonry grid (66 public photos), search by area/place/district, district dropdown, clickable map filter, pagination, "Add photo" |
| 6.2 | Photo page | `/photo/{id}` | Full image, district/place tags, uploader display name, like button, comments (max 100 characters), Report dialog |
| 6.3 | Upload photo | `/upload` | Open to everyone (no account needed): name, optional private email, up to 3 photos per batch (≤5 MB each), district, optional place. Photos are shrunk and re-encoded in the browser so GPS/camera data never reaches the server. Limit: 2 upload batches per day per IP, with a "N more today" counter. Nothing goes public before moderation |
| 6.4 | Posts | home feed, profile | Text + emoji + photos; likes, ★ rating, share, comments; paginated |
| 6.5 | Visitor suggestions | home | Suggest a place or a famous food/product; admin approval; likes/upvotes/rating |
| 6.6 | Trending votes | place pages, home | "Add to trending" vote per place; seasonal ranking with comments |
| 6.7 | Tips & corrections | place/about pages | "Send a tip or correction" form |

## 7. Directory & listings

| # | Feature | URL | What it does |
|---|---|---|---|
| 7.1 | Hotels & resorts | `/stay` | Hotels (area chips Dhaka/Chattogram/Khulna) and Resorts (Bandarban, Inani, Sreemangal, St Martin's, Cox's Bazar, Sajek); cards with photo source credit, category, ★ rating, review count; detail dialog with "Open in Google Maps"; owner-added section |
| 7.2 | Where to eat | `/restaurants` | Restaurants & cafés by area, same card/dialog pattern; owner-added section; home-cooked food section |
| 7.3 | Shopping | `/shopping` | Malls by area; entrepreneurs' products section |
| 7.4 | Local listings | `/listings` | Hotels/resorts/restaurants · home-made food · products added by owners |
| 7.5 | Add a listing | `/add-listing?kind=business|food|product` | Type tabs, size tier (small ≤5 prices & 3–5 photos, medium ≤12 & 3–8, large ≤25 & 3–10), name, district, area, 600-char description, repeatable price rows (item + ৳ + unit), phone, WhatsApp, social link, photos, contact name, hidden honeypot field; "Submit for review" |
| 7.6 | My listings | `/my-listings` | Owner dashboard of submitted listings |

## 8. Account

| # | Feature | Details |
|---|---|---|
| 8.1 | Sign-in | Email/password and Google Sign-In (GSI); session cookie + CSRF token |
| 8.2 | Profile `/profile` | Name, @handle, "Create post", "My listings"; tabs: Summary (visited districts, trips, photos, total trip spend, visited map, "plan next trip"), View history, Trips, Photos, My posts, Want to go, Settings |
| 8.3 | Data control | Works fully without an account (visited districts stay in the browser). With an account the site stores name, email, hashed password, visited districts, viewing history, plans, costs and photos. Users delete their own history and photos from the profile; full account deletion is by contacting the creator. Quiz names appear on leaderboards only after a human approves them |

## 9. Trust & data provenance

- Every fare/timetable carries `asOf`, `confidence` and source links (BRTA, district portals, Bangladesh Railway e-ticket and timetables, airline schedules).
- Place photos are mostly Wikimedia Commons with photographer and licence shown.
- District boundaries from geoBoundaries (BBS); Bengali font Kalpurush (Avro project, OFL).
- ★ x/10 ratings are an editorial score; ♥ and ▲ are community counts.

## 10. Not working / notes

- `/challenge` is in the sitemap but showed "page not found" in the browser (it likely needs a challenge token in the URL).
- `/search` without `?q=` returns the 404 page.
- Chinese, French, German, Italian and Japanese are interface translations only; they are not in the sitemap (only `bn` and `en` pages are).
