# Phase 16 of 18: Real photos, info pages, PWA and SEO

You are building Unseen BD. Phases 01–15 are done.

## Read first
- `DESIGN.md` §3 (real photos rule), §5.10
- `FEATURES.md` §1.7–1.10, §4.7–4.8
- `MASTER_PROMPT.md` §7 and §9
- `data/places.json` → `image_credit`, `data/reference.json` → `emergency_numbers`, `packing_list_groups_en`, `foreign_tour`

## Build
1. **Real photos (Wikimedia Commons):** `web/scripts/fetch-photos.mjs` reads `image_credit.source` for the 170 places that have one, resolves each Commons file page through the Commons API (`action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600`), downloads the image, converts to WebP at 640 and 1200 wide into `web/storage/photos/` (gitignored, served like covers), and writes `data/content/photos.json` with `{slug, file, author, license, license_url, source}`. Respect Commons' API etiquette (descriptive User-Agent, one request at a time, retries with backoff). Never download from unseenbd.com. Place pages and cards use the photo when present, the illustrated cover otherwise, and always show "Photo: {author} · {license} · Wikimedia Commons" linked to the source.
2. **Info pages:** `/safety` (tap-to-call numbers, share-my-location, tips, five packing checklists), `/about` (what this is, credits: Wikimedia photographers, OCHA/BBS boundaries "Boundaries: BBS, OCHA", Natural Earth, OFL fonts; privacy section `#privacy` matching what the app actually stores; terms; how data is verified), `/foreign-tour` (13 countries), friendly 404.
3. **PWA:** service worker (precache shell, runtime cache for pages and images, offline page); "Keep offline" on district pages caches that district's pages and covers; installable manifest.
4. **SEO:** `sitemap.xml` (bn + en, all public routes, image entries), `robots.txt` (disallow `/api/`, auth and account pages), `hreflang` alternates and canonicals on every page, OpenGraph images (`social/og-default-*` for generic pages, covers for places).
5. **Performance:** responsive images with `sizes`, lazy loading below the fold, route-level code splitting, HTTP caching headers for static data and media.

## Done when
- `npm run check` passes; the photo script runs (document that it needs network); Lighthouse mobile ≥ 90 performance and ≥ 95 accessibility/SEO on home, a place page and the planner; the site works offline for a kept district.

## Commit
feature(site): add Commons photos with credits, info pages, PWA and SEO

- credited Wikimedia Commons photos for 170 places with cover fallback
- safety, about/privacy/terms, foreign tour and 404 pages
- service worker with keep-offline districts, sitemap, robots and hreflang
